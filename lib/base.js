/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * The base of all connections.
 *
 * @private
 */
class Connection {
  constructor () {
    // Add instance properties
    this.id = undefined
    this.channel = undefined
    this._started = false
    this._options = {}
  }

  /**
   * Sets an option in options.
   *
   * @param {String} path
   * @param {Any} value
   * @param {Boolean} [overwrite]
   * @return {self} for chaining
   * @public
   */
  set (path, value, overwrite) {
    let keys, key, cur, idx, len, obj, rec, set

    // Split path into keys
    keys = path.split('.')

    // Offset 1 to get parent
    len = keys.length - 1

    // Sets the `value` on `obj` under `key`
    set = (obj, key) => {
      // Only if we don't have the key OR `overwrite` is true do we set value.
      if (obj[key] === undefined ||
        Boolean(overwrite !== undefined ? overwrite : true)) {
        obj[key] = value
      }
    }

    // If we have a straight path, set `value` under `path`.
    if (!len) {
      set(this._options, path)

      // Return self to be chainable
      return this
    }

    // Set index now (after we ckeched path)
    idx = 0

    // Recuurs until path is reached
    rec = (obj) => {
      if (idx >= len) return obj

      key = keys[idx++]
      cur = obj[key]

      if (cur === undefined) {
        cur = obj[key] = {}
      } else if (cur === null) {
        return
      }

      return rec(cur)
    }

    // Get desired path's end's parent
    obj = rec(this._options)

    // Only set value if we finished the recurring search properly
    if (idx >= len && obj) {
      set(obj, keys[idx])
    }

    // Return self to be chainable
    return this
  }

  /**
  * Gets an option from options.
  * If option is not found, returns `def` or undefined.
  *
  * @param {String} path
  * @param {Any} [def]
  * @public
  */
  get (path, def) {
    let keys, key, cur, idx, len, obj, rec

    // Split path into keys
    keys = path.split('.')

    len = keys.length

    // If we still only have one key, return option for key.
    if (!(len - 1)) {
      if (this._options[path] === undefined) {
        return def
      }

      return this._options[path]
    }

    // Set index now (after we ckeched path)
    idx = 0

    rec = (obj) => {
      if (idx >= len) return obj

      key = keys[idx++]
      cur = obj[key]

      if (cur === undefined ||
        cur === null) return

      return rec(cur)
    }

    // Get desired path's end value
    obj = rec(this._options)

    // If we didn't finish our search properly, explicly return `def`
    if (obj === undefined || idx < len) {
      return def
    }

    // Return value
    return obj
  }

  /**
   * Check if `option` is enabled (truthy).
   *
   * @param {String} option
   * @return {Boolean} enabled
   * @public
   */
  enabled (option) {
    return Boolean(this.get(option))
  }

  /**
   * Check if `option` is disabled.
   *
   * @param {String} option
   * @return {Boolean} disabled
   * @public
   */
  disabled (option) {
    return !this.get(option)
  }

  /**
   * Enables `option`. Possible overwrite.
   *
   * @param {String} option
   * @param {Boolean} [overwrite]
   * @return {self} for chaining
   * @public
   */
  enable (option, overwrite) {
    return this.set(option, true, overwrite)
  }

  /**
   * Disables `option`. Possible overwrite.
   *
   * @param {String} option
   * @param {Boolean} [overwrite]
   * @return {self} for chaining
   * @public
   */
  disable (option, overwrite) {
    return this.set(option, false, overwrite)
  }

  /**
   * Sets all keys from `options`.
   *
   * @param {Object} options
   * @param {Boolean} [overwrite]
   * @returns {Object} options
   * @public
   */
  options (options, overwrite) {
    if (!arguments.length) return this._options

    if (typeof options === 'object') {
      let keys, idx

      keys = Object.keys(options)
      idx = keys.length

      while (idx--) {
        this.set(keys[idx], options[keys[idx]], overwrite)
      }
    }

    return this._options
  }

  /**
   * Same as options, but chainable.
   *
   * @param {Object} options
   * @param {Boolean} [overwrite]
   * @return {self} for chaining
   * @public
   */
  init (options, overwrite) {
    this.options(options, overwrite)

    return this
  }

  /**
   * Starts the work for connection. Will be overwritten.
   *
   * @return {Boolean} continue
   * @public
   */
  start () {
    if (this._started) return false
    this._started = true
    return true
  }
}
// Export class
module.exports = Connection
