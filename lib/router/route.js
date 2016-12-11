/*!
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2016 Mikal Stordal
 * MIT Licensed
 */
'use strict'

/**
 * Module dependencies.
 * @private
 */
const debug = require('debug')('ccr:router:route')
const flatten = require('array-flatten')
const Layer = require('./layer')

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @public
 */
class Route {
  constructor (path) {
    this.path = path
    this.stack = []

    debug('new %s', path)
  }

  /**
   * dispatch request into this route
   * @private
   */
  dispatch (req, done) {
    let idx = 0

    let stack = this.stack
    if (stack.length === 0) {
      return done()
    }

    req.route = this

    next()

    function next (err) {
      if (err && err === 'route') {
        return done()
      }

      let layer = stack[idx++]
      if (!layer) {
        return done(err)
      }

      if (err) {
        layer.handle_error(err, req, next)
      } else {
        layer.handle_request(req, next)
      }
    }
  }

  /**
   * Add a handler to this route.
   *
   * Behaves just like middleware and can respond or call `next`
   * to continue processing.
   *
   * @param {function} handler
   * @return {Route} for chaining
   * @api public
   */
  add (...args) {
    let handles = flatten(args)

    for (let i = 0; i < handles.length; i++) {
      let handle = handles[i]

      if (typeof handle !== 'function') {
        let type = typeof handle
        let msg = 'Route.all() requires callback functions but got a ' + type
        throw new TypeError(msg)
      }

      // Push new layer to stack
      this.stack.push(new Layer('/', {}, handle))
    }

    return this
  }
}

/**
 * Module exports.
 * @public
 */
module.exports = Route