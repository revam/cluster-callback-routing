/*! Copyright (c) 2016-2017 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const debug = require('debug')('ccr:worker')

const Base = require('./base')
const Mixer = require('./mixer')

/**
 * Worker connection. Sends out requests.
 *
 * @param {Cluster} cluster
 * @param {String} moduleRoot
 * @return {WorkerConnection} instance
 *
 * @class WorkerConnection
 * @extends BaseConnection
 * @extends Mixer
 * @public
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
    super.set('module root', moduleRoot, false)
    super.set('env', process.env.NODE_ENV || 'development', false)

    super.set('routes', 'routes', false)

    debug('Worker on Channel %s', this.channel)
  }
}
// Export class
module.exports = WorkerConnection
