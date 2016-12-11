/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const debug = require('debug')('ccr:worker')
const includes = require('array-includes')

const Base = require('./base')
const Mixer = require('./mixer')

/**
 * Worker connection. Sends out requests.
 */
class WorkerConnection extends Mixer(Base) {
  constructor (cluster, moduleRoot) {
    super()

    // Add instance properties
    this.key = 'worker'
    this.id = cluster.worker.id
    this.channel = parseInt(process.env.CHANNEL, 10)
    this._route = false
    this._worker = cluster.worker
    this._callbacks = {}

    // Set default options
    this.set('module root', moduleRoot, false)
    this.set('env', process.env.NODE_ENV || 'development', false)

    this.set('worker', '', false)

    debug('New Worker on Channel %s', this.channel)
  }
}
// Export class
module.exports = WorkerConnection