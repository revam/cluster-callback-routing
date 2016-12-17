/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const path = require('path')
const uuid = require('node-uuid')
const debug = require('debug')('ccr:mixer')
const onIncoming = require('./on-incoming')

/**
 * Mixes itself into `Base` class.
 *
 * @private
 */
const Mixer = Base => class extends Base {
  /**
   * Sets an option in options.
   *
   * @param {String} path
   * @param {Any} value
   * @param {Boolean} overwrite
   * @return {self} for chaining
   * @public
   */
  set (key, value, overwrite) {
    // When setting routes, find ourself and set value.
    if (key === 'routes') {
      // Set string if found
      if (typeof value === 'string') {
        this._route = path.join(value, this.key)
      // Recurr on object
      } else if (typeof value[this.key] === 'object') {
        this.options(value[this.key], true)
      // Else try to get value
      } else {
        this._route = getVal(value[this.key])
      }

      return this
    // When setting route, try to get value.
    } else if (key === 'route') {
      this._route = getVal(value)

      return this
    }

    // Call super method
    super.set(key, value, overwrite)

    return this
  }

  /**
   * Starts the work for connection.
   *
   * @return {self} for chaining
   * @public
   */
  start () {
    // Continue only if super permits it.
    if (!super.start()) return this

    debug('Starting Worker on Channel %s', this.channel)

    if (this._route) {
      debug('Getting script')
      let fn = getFn(this, this._route)

      // Only run if `fn` is valid
      if (fn) {
        debug('Running script')

        fn(this)
      }
    }

    // Open communication on IPC to route handler
    debug('Opening IPC')
    this._worker.on('message', onIncoming(this))

    debug('Started Worker on Channel %s', this.channel)

    return this
  }

  /**
   * Sends a request to hub.
   *
   * @param {String} path
   * @param {Any} [load]
   * @param {Function} callback
   * @return {self} for chainable
   * @public
   */
  request (path, ...load) {
    if (load.length < 1 || typeof load[load.length - 1] !== 'function') {
      throw new TypeError('No callback spesified')
    }

    let key = uuid.v4()

    // Set callback under key
    this._callbacks[key] = load.splice(-1, 1)[0]

    this._worker.send({
      key: key,
      load: load,
      path: path
    })

    debug('Sent %s on Channel %s', key, this.channel)

    return this
  }

  extendPath () {
    let args = [this.get('module root')]
      .concat(Array.prototype.slice.apply(arguments))

    return path.resolve.apply(path, args)
  }
}
// Export mixer
module.exports = Mixer

/**
 * Gets a function out of `value` if possible
 *
 * @private
 */
function getFn (options, value) {
  let type = typeof value
  if (type === 'function') {
    return value
  } else if (type === 'string') {
    let fn = require(path.join(options.get('module root'), value))

    return getFn(options, fn)
  }

  return false
}

/**
 * Gets a function out of `value` if possible
 *
 * @private
 */
function getVal (value) {
  let type = typeof value

  if (type === 'function' || type === 'string') {
    return value
  }

  return false
}
