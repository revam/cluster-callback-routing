/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Base connection
 * @private
 */
const debug = require('debug')('ccr:router:request')

/**
 * Requests injected into routers.
 * @private
 */
class Request {
  constructor (connection, worker, message) {
    this.key = message.key
    this.channel = message.channel
    this._sent = false

    this.path = message.path
    this.basePath = ''
    this.originalPath = this.path

    this.params = {}
    this.load = message.load
    this._worker = worker
    this._connection = connection

    debug('New request %s : %s', this.key, this.path)
  }

  /**
   * Sends a response for request
   * @public
   */
  send (...load) {
    if (this._sent) return
    this._sent = true

    let message = {
      key: this.key,
      channel: this.channel,
      load: load
    }

    this._worker.send(message)
  }
}

module.exports = Request
