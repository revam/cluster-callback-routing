/*!
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * Copyright(c) 2016 Mikal Stordal
 * MIT Licensed
 */
'use strict'

/**
 * Module dependencies.
 * @private
 */

const Route = require('./route')
const Layer = require('./layer')
const debug = require('debug')('ccr:router')
const flatten = require('array-flatten')

/**
 * Module variables.
 * @private
 */

const objectRegExp = /^\[object (\S+)\]$/
const slice = Array.prototype.slice
const toString = Object.prototype.toString

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @param {Object} options
 * @return {Router} which is an callable function
 * @public
 */
module.exports = class Router {
  constructor (options) {
    options = options || {}

    this.stack = []
    this.params = {}

    this.caseSensitive = options.caseSensitive
    this.mergeParams = options.mergeParams
    this.strict = options.strict
  }

  /**
   * Map the given param placeholder `name`(s) to the given callback.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {app} for chaining
   * @public
   */
  param (name, fn) {
    if (typeof name !== 'string') {
      throw new Error('invalid param() caller, got ' + name)
    }

    // ensure we end up with a middleware function
    if (typeof fn !== 'function') {
      throw new Error('invalid param() call for ' + name + ', got ' + fn)
    }

    (this.params[name] = this.params[name] || []).push(fn)

    return this
  }

  /**
   * Dispatch a req, res into the router.
   * @private
   */
  handle (req, out) {
    let self = this

    debug('dispatching %s', req.path)

    let fqdn = req.path[0] !== '/'
    let idx = 0
    let removed = ''
    let slashAdded = false

    // middleware and routes
    let stack = self.stack

    // manage inter-router variables
    let parentParams = req.params
    let parentPath = req.basePath || ''
    let done = restore(out, req, 'basePath', 'next', 'params')

    // setup next layer
    req.next = next

    // setup basic req values
    req.basePath = parentPath
    req.originalPath = req.originalPath || req.path

    // start the queue
    next()

    function next (err) {
      let layerError = err === 'route'
        ? null
        : err

      // remove added slash
      if (slashAdded) {
        req.path = req.path.substr(1)
        slashAdded = false
      }

      // restore altered req.path
      if (removed.length !== 0) {
        req.basePath = parentPath
        req.path = removed + req.path
        removed = ''
      }

      // no more matching layers
      if (idx >= stack.length) {
        process.nextTick(done, layerError)
        return
      }

      // find next matching layer
      let path, layer, match, route
      // get pathname of request
      path = req.path
      while (match !== true && idx < stack.length) {
        layer = stack[idx++]
        match = matchLayer(layer, path)
        route = layer.route

        if (typeof match !== 'boolean') {
          // hold on to layerError
          layerError = layerError || match
        }

        if (match !== true) {
          continue
        }

        if (!route) {
          // process non-route handlers normally
          continue
        }

        if (layerError) {
          // routes do not match with a pending error
          match = false
          continue
        }
      }

      // no match
      if (match !== true) {
        return done(layerError)
      }

      // store route for dispatch on change
      if (route) {
        req.route = route
      }

      // Capture one-time layer values
      req.params = self.mergeParams
        ? mergeParams(layer.params, parentParams)
        : layer.params
      let layerPath = layer.path

      // this should be done for the layer
      self.process_params(layer, req, (err) => {
        let c = path[layerPath.length]

        if (err) {
          return next(layerError || err)
        }

        if (route) {
          return layer.handle_request(req, next)
        }

        if (c && c !== '/' && c !== '.') return next(layerError)

         // Trim off the part of the url that matches the route
         // middleware (.use stuff) needs to have the path stripped
        if (layerPath.length !== 0) {
          debug('trim prefix (%s) from path %s', layerPath, req.path)

          removed = layerPath
          req.path = req.path.substr(removed.length)

          // Ensure leading slash
          if (!fqdn && req.path[0] !== '/') {
            req.path = '/' + req.path
            slashAdded = true
          }

          // Setup base URL (no trailing slash)
          req.basePath = parentPath + (removed[removed.length - 1] === '/'
            ? removed.substring(0, removed.length - 1)
            : removed)
        }

        debug('%s %s : %s', layer.name, layerPath, req.originalPath)

        if (layerError) {
          layer.handle_error(layerError, req, next)
        } else {
          layer.handle_request(req, next)
        }
      })
    }
  }

  /**
   * Process any parameters for the layer.
   * @private
   */
  process_params (layer, req, done) {
    let params = this.params

    // captured parameters from the layer, keys and values
    let keys = layer.keys

    // fast track
    if (!keys || keys.length === 0) {
      return done()
    }

    let i = 0
    let name
    let paramIndex = 0
    let key
    let called = {}
    let paramVal
    let paramCallbacks
    let paramCalled

    // process params in order
    // param callbacks can be async
    function param (err) {
      if (err) {
        return done(err)
      }

      if (i >= keys.length) {
        return done()
      }

      paramIndex = 0
      key = keys[i++]

      if (!key) {
        return done()
      }

      name = key.name
      paramVal = req.params[name]
      paramCallbacks = params[name]
      paramCalled = called[name]

      if (paramVal === undefined || !paramCallbacks) {
        return param()
      }

      // param previously called with same value or error occurred
      if (paramCalled && (paramCalled.match === paramVal ||
        (paramCalled.error && paramCalled.error !== 'route'))) {
        // restore value
        req.params[name] = paramCalled.value

        // next param
        return param(paramCalled.error)
      }

      called[name] = paramCalled = {
        error: null,
        match: paramVal,
        value: paramVal
      }

      paramCallback()
    }

    // single param callbacks
    function paramCallback (err) {
      var fn = paramCallbacks[paramIndex++]

      // store updated value
      paramCalled.value = req.params[key.name]

      if (err) {
        // store error
        paramCalled.error = err
        param(err)
        return
      }

      if (!fn) return param()

      try {
        fn(req, paramCallback, paramVal, key.name)
      } catch (e) {
        paramCallback(e)
      }
    }

    param()
  }

  /**
   * Use the given middleware function, with optional path, defaulting to "/".
   *
   * Use (like `.all`) will run for any http METHOD, but it will not add
   * handlers for those methods so OPTIONS requests will not consider `.use`
   * functions even if they could respond.
   *
   * The other difference is that _route_ path is stripped and not visible
   * to the handler function. The main effect of this feature is that mounted
   * handlers can operate without any code changes regardless of the "prefix"
   * pathname.
   *
   * @public
   */
  use (path) {
    if (typeof path !== 'string') {
      throw new TypeError('Router.use() requires a mount path')
    }

    let callbacks = flatten(slice.call(arguments, 1))

    if (callbacks.length === 0) {
      throw new TypeError('Router.use() requires middleware functions')
    }

    for (let i = 0; i < callbacks.length; i++) {
      let fn = callbacks[i]

      if (typeof fn !== 'object' && fn.handle) {
        let router = fn
        fn = (req, next) => {
          router.handle(req, next)
        }
      } else if (typeof fn !== 'function') {
        throw new TypeError('Router.use() requires middleware function but got a ' + getType(fn))
      }

      // add the middleware
      debug('use %s %s', path, fn.name || '<anonymous>')

      let layer = new Layer(path, {
        sensitive: this.caseSensitive,
        strict: false,
        end: false
      }, fn)

      layer.route = undefined

      this.stack.push(layer)
    }

    return this
  }

  /**
   * Create a new Route for the given path.
   *
   * Each route contains a separate middleware stack and VERB handlers.
   *
   * See the Route api documentation for details on adding handlers
   * and middleware to routes.
   *
   * @param {String} path
   * @return {Route}
   * @public
   */
  route (path) {
    let route = new Route(path)

    let layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: this.strict,
      end: true
    }, route.dispatch.bind(route))
    layer.route = route

    this.stack.push(layer)

    return route
  }

  add (path) {
    let route = this.route(path)

    route.add.apply(route, slice.call(arguments, 1))

    return this
  }
}

// get type for error message
function getType (obj) {
  let type = typeof obj

  if (type !== 'object') {
    return type
  }

  // inspect [[Class]] for objects
  return toString.call(obj)
    .replace(objectRegExp, '$1')
}

/**
 * Match path to a layer.
 *
 * @param {Layer} layer
 * @param {string} path
 * @private
 */

function matchLayer (layer, path) {
  try {
    return layer.match(path)
  } catch (err) {
    return err
  }
}

// merge params with parent params
function mergeParams (params, parent) {
  if (typeof parent !== 'object' || !parent) {
    return params
  }

  // make copy of parent for base
  let obj = Object.assign({}, parent)

  // simple non-numeric merging
  if (!(0 in params) || !(0 in parent)) {
    return Object.assign(obj, params)
  }

  let i = 0
  let o = 0

  // determine numeric gaps
  while (i in params) {
    i++
  }

  while (o in parent) {
    o++
  }

  // offset numeric indices in params before merge
  for (i--; i >= 0; i--) {
    params[i + o] = params[i]

    // create holes for the merge when necessary
    if (i < o) {
      delete params[i]
    }
  }

  return Object.assign(obj, params)
}

// restore obj props after function
function restore (fn, obj) {
  let props = new Array(arguments.length - 2)
  let vals = new Array(arguments.length - 2)

  for (let i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2]
    vals[i] = obj[props[i]]
  }

  return function () {
    // restore vals
    for (let i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i]
    }

    return fn.apply(this, arguments)
  }
}
