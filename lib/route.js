/*! Copyright (c) 2016-2017 Mikal Stordal | MIT Licensed */
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
 *
 * @param {Cluster} cluster
 * @param {String} moduleRoot
 * @return {RouteConnection} instance
 *
 * @class RouteConnection
 * @extends BaseConnection
 * @extends Mixer
 * @public
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

    super.set('routes', 'routes', false)

    super.enable('case sensitive routing', false)

    debug('Route "%s" on Channel %s', this.key, this.channel)
  }

  /**
   * Uses `fns` on all routes matching `path` for callback.
   * Path defaults to '/'.
   *
   * @param {String} [path]
   * @param {Functions} fns
   * @return {self} for chaining
   * @public
   */
  route (path) {
    let offset = 1

    if (typeof path !== 'function') {
      let arg = path

      while (Array.isArray(arg) && arg.length !== 0) {
        arg = arg[0]
      }

      // first arg is not the path
      if (typeof arg === 'function') {
        offset = 0
        path = '/'
      }
    }

    debug('Using path %s', path)

    let fns = flatten(slice.call(arguments, offset))

    if (fns.length === 0) {
      throw new TypeError('#route() requires functions')
    }

    // Setup router
    lazyrouter(this)

    fns.forEach(fn => this._router.route(path, fn))

    return this
  }

  /**
   * Process param `name` with callback `fn`.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {self} for chaining
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
   * Returns a new Router instance.
   *
   * @param {Object} [options]
   * @return {Router} router
   * @public
   */
  router (options) {
    return new Router(Object.assign({
      caseSensitive: this.get('case sensitive routing')
    }, options))
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
      caseSensitive: connection.enabled('case sensitive routing')
    })
  }
}
