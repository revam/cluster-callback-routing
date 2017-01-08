/*!
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * Copyright(c) 2016-2017 Mikal Stordal
 * MIT Licensed
 */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const pathRegexp = require('path-to-regexp')
const debug = require('debug')('ccr:router:layer')

/**
 * A route layer.
 *
 * @class Layer
 * @private
 */
class Layer {
  constructor (path, options, fn) {
    options = options || {}

    debug('new %s', path)

    this.handle = fn
    this.name = fn.name || '<anonymous>'

    this.params = undefined
    this.path = undefined

    this.keys = []
    this.regexp = pathRegexp(path, this.keys, options)

    if (path === '/' && options.end === false) {
      this.regexp.fast_slash = true
    }
  }

  /**
   * Handle the error for the layer.
   *
   * @param {Error} err
   * @param {Request} req
   * @param {Function} next
   * @private
   */
  handle_error (err, req, next) {
    let fn = this.handle

    if (fn.length !== 3) {
      // not a standard error handler
      return next(err)
    }

    try {
      fn(err, req, next)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Handle the request for the layer.
   *
   * @param {Request} req
   * @param {Function} next
   * @private
   */
  handle_request (req, next) {
    let fn = this.handle

    if (fn.length > 2) {
      // not a standard request handler
      return next()
    }

    try {
      fn(req, next)
    } catch (err) {
      next(err)
    }
  }

  /**
   * Check if this layer matches `path`, if so
   * populate `this.params`.
   *
   * @param {String} path
   * @return {Boolean} match
   * @private
   */
  match (path) {
    if (path == null) {
      // no path, nothing matches
      this.params = undefined
      this.path = undefined
      return false
    }

    if (this.regexp.fast_slash) {
      // fast path non-ending match for / (everything matches)
      this.params = {}
      this.path = ''
      return true
    }

    let m = this.regexp.exec(path)

    if (!m) {
      this.params = undefined
      this.path = undefined
      return false
    }

    // store values
    this.params = {}
    this.path = m[0]

    let keys = this.keys
    let params = this.params

    for (let i = 1; i < m.length; i++) {
      let key = keys[i - 1]
      let prop = key.name
      let val = decode_param(m[i])

      if (val !== undefined || !params.hasOwnProperty(prop)) {
        params[prop] = val
      }
    }

    return true
  }
}
// Export class
module.exports = Layer

/**
 * Decodes parameter value.
 *
 * @param {String} value
 * @return {String} decoded
 * @private
 */
function decode_param (val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val
  }

  try {
    return decodeURIComponent(val)
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\''
      err.status = err.statusCode = 400
    }

    throw err
  }
}
