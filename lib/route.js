/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const debug = require('debug')('ccr:route')
const flatten = require('array-flatten')

const Base = require('./base')
const Router = require('./router')
const Mixer = require('./mixer')

/**
 * Module variables.
 *
 * @private
 */
const slice = Array.prototype.slice

/**
 * Route connection. Handles incoming requests from hub.
 */
class RouteConnection extends Mixer(Base) {
  constructor (cluster, moduleRoot) {
    super()

    // Add instance properties
    this.key = process.env.CCR_KEY
    this.id = cluster.worker.id
    this.channel = parseInt(process.env.CHANNEL, 10)
    this._route = false
    this._router = undefined
    this._worker = cluster.worker
    this._callbacks = {}

    // Set default options
    super.set('module root', moduleRoot, false)
    super.set('env', process.env.NODE_ENV || 'development', false)

    super.disable('strict routing', false)
    super.enable('case sensitive routing', false)

    debug('New Route for "%s" on Channel %s', this.key, this.channel)
  }

  /**
   * Uses `fn` on all routes for callback
   *
   * @public
   */
  use (fn) {
    let offset, path, fns

    offset = 0
    path = '/'

    if (typeof fn !== 'function') {
      var arg = fn

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0]
      }

      // first arg is the path
      if (typeof arg !== 'function') {
        offset = 1
        path = fn
      }
    }

    debug('Using path %s', path)

    fns = flatten(slice.call(arguments, offset))

    if (fns.length === 0) {
      throw new TypeError('con.use() requires middleware functions')
    }

    // Setup router
    lazyrouter(this)
    let router = this._router

    fns.forEach(fn => {
      router.use(path, fn)
    })

    return this
  }

  /**
   * Creates a new Route.
   *
   * @public
   */
  route (path) {
    lazyrouter(this)

    return this._router.route(path)
  }

  /**
   * Handles param here.
   *
   * @public
   */
  param (name, fn) {
    lazyrouter(this)

    if (Array.isArray(name)) {
      for (var i = 0; i < name.length; i++) {
        this.param(name[i], fn)
      }

      return this
    }

    debug('Adding param %s', name)

    this._router.param(name, fn)

    return this
  }

  /**
   *
   *
   * @public
   */
  add (path) {
    lazyrouter(this)

    debug('Adding path %s', path)

    let route = this._router.route(path)
    route.add.apply(route, slice.call(arguments, 1))

    return this
  }

  /**
   * Returns a new Router instance.
   * @public
   */
  Router (options) {
    return new Router(options)
  }
}
// Export class
module.exports = RouteConnection

/**
 * Only starts router if needed.
 *
 * @private
 */
function lazyrouter (connection) {
  if (!connection._router) {
    connection._router = new Router({
      caseSensitive: connection.enabled('case sensitive routing'),
      strict: connection.enabled('strict routing')
    })
  }
}
