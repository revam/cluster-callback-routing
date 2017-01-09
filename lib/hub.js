 /*! Copyright (c) 2016-2017 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const fs = require('fs')
const path = require('path')
const debug = require('debug')('ccr:hub')
const includes = require('array-includes')
const onIncoming = require('./on-incoming')

const Base = require('./base')
const Router = require('./router')

/**
 * Module variables.
 *
 * @private
 */
const RESERVED = [
  'route',
  'worker',
  'index'
]

/**
 * Connection Hub. Acting as the central hub, routing requests between nodes (workers).
 *
 * @param {Cluster} cluster
 * @param {String} moduleRoot
 * @return {ConnectionHub} instance
 *
 * @class ConnectionHub
 * @extends BaseConnection
 * @public
 */
class ConnectionHub extends Base {
  constructor (cluster, moduleRoot) {
    super()

    // Add instance properties
    this._channels = {}
    this._cluster = cluster
    this._keys = undefined
    this._route = false
    this._router = undefined
    this._worker = false
    this._workers = {}

    // Set default options, skip extended method where we can
    super.set('module root', moduleRoot, false)
    super.set('env', process.env.NODE_ENV || 'development', false)

    super.set('routes', 'routes', false)
    super.disable('respawn', false)

    super.enable('case sensitive routing', false)

    debug('Hub created')
  }

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
    // Set route or keys per need.
    if (key === 'routes') {
      // Set route path with delayed key collection
      if (typeof value === 'string') {
        // Set value with super
        super.set('routes', value, overwrite)

        // Clear keys
        this._keys = undefined
      // Or set keys from given object
      } else if (typeof value === 'object') {
        setKeys(this, value)
      }

      // Explicly return, to save time.
      return this
    }

    // Call super method
    super.set(key, value, overwrite)

    return this
  }

  /**
   * Starts the connections.
   *
   * @return {self} for chainable
   * @public
   */
  start () {
    // Continue only if super permits it.
    if (!super.start()) return this

    // Be verbose while debugging.
    debug('Starting Hub')

    // Set delayed defaults, no-overwrite
    this.set('count', require('os').cpus().length, false)

    // Set counter to initial value
    let counter = 0

    // Get keys and set flags
    let keys = getKeys(this)

    // First setup router and open channels, then start routes and workers
    debug('Creating router')
    this._router = new Router({
      caseSensitive: this.enabled('case sensitive routing')
    })

    // Add request routing to desired route.
    this._router.route(':key/*', checkForKey(this), sendToDefault(this))

    // Open communication on IPC to route handler
    debug('Opening IPC')
    this._cluster.on('message', onIncoming(this))

    // Create default route ONLY when needed
    if (this._route) {
      debug('Disbatching default route')
      createRoute(this, 'route', counter)
    }

    // Spawn other routes ONLY when needed
    if (keys.length) {
      let ticker = keys.length
      debug('Disbatching %s special route%s', ticker, ticker === 1 ? '' : 's')
      while (ticker--) { createRoute(this, keys[counter], ++counter) }
    }

    // Spawn workers ONLY when needed
    if (this._worker) {
      let ticker = this.get('count', 1)
      debug('Disbatching %s normal worker%s', ticker, ticker === 1 ? '' : 's')
      while (ticker--) { createWorker(this, ++counter) }
    }

    debug('Started Hub')

    return this
  }
}
// Export class
module.exports = ConnectionHub

/**
 * Creates a (normal) worker.
 *
 * @private
 */
function createWorker (connection, channel) {
  let worker = connection._cluster.fork({
    CHANNEL: channel
  })

  // Set channel reference
  setChannel(connection, channel, worker.id)

  worker.on('exit', () => {
    let msg = `Worker ${worker.id} on channel ${channel} died. :(`

    // Silently exit when respawning is disabled.
    if (connection.disabled('respawn')) {
      console.log(msg)
      process.exit()
    }

    // Print error on console
    console.error(msg)

    // Create a new worker
    createWorker(connection, channel)
  })
}

/**
 * Creates a route (worker).
 *
 * @private
 */
function createRoute (connection, key, channel) {
  let worker = connection._cluster.fork({
    CHANNEL: channel,
    CCR_KEY: key
  })

  // Set channel reference
  setChannel(connection, channel, worker.id, key)

  worker.on('exit', () => {
    let msg = `Privileged worker ${worker.id} (${key}) on channel ${channel} died. :(`

    // Silently exit when respawning is disabled.
    if (connection.disabled('respawn')) {
      console.log(msg)
      process.exit()
    }

    // Print error on console
    console.error(msg)

    // Create a new route
    createRoute(connection, key, channel)
  })
}

/**
 * Links channel (id) and worker (id).
 *
 * @private
 */
function setChannel (connection, channel, worker, key) {
  // Delete previous reference when needed
  if (connection._workers[channel]) {
    delete connection._channels[connection._workers[channel]]
  }

  // Set reference to worker (by id)
  connection._workers[channel] = worker

  // Set references to channel (by id)
  connection._channels[worker] = channel

  // Set references to channel (by id) when needed
  if (key) {
    connection._keys[key] = channel
  }
}

/**
 * Routing middleware. Routes requests to their respected channels if needed.
 *
 * @private
 */
function checkForKey (connection) {
  let keys = []
  // Fill keys
  getKeys(connection).forEach(key => !includes(RESERVED, key) ? keys.push(key) : '')
  let caseSensitive = connection.disabled('case sensetive routing')
  return (req, next) => {
    let key = req.params.key

    // If we don't have the param, or we have an invalid param, skip.
    // Respect case sensetivity
    if (!key || !includes(keys, caseSensitive ? key.toLowerCase()
    : key)) return process.nextTick(next)

    return process.nextTick(forward, connection, req, req.params[0], key)
  }
}

/**
 * Routing middleware. Routes requests to default channel for 'route'.
 *
 * @private
 */
function sendToDefault (connection) {
  // If default flag is equal to false, then skip all default requests.
  if (!connection._route) {
    return (req, next) => process.nextTick(next, new Error('No default route'))
  }

  // Else, forward request.
  return req => process.nextTick(forward, connection, req, req.originalPath, 'route')
}

/**
 * Forwards a request to channel corresponding to key.
 *
 * @private
 */
function forward (connection, req, path, key) {
  let channel = connection._keys[key]
  debug('Forwarding request %s to Channel %s (%s)', req.key, channel, key)

  let worker = connection._cluster.workers[connection._workers[channel]]

  // Drop current request, halting request queue.
  req._sent = true

   // Send to worker
  worker.send({
    key: req.key,
    load: req.load,
    path: path,
    channel: connection._channels[req._worker.id]
  })
}

/**
 * Sets key object
 *
 * @private
 */
function setKeys (connection, value) {
  let keys
  let type = typeof value
  // Search for routes within given parent (folder path).
  if (type === 'string') {
    // Get paths
    let folder = path.resolve(connection.get('module root'), value)
    let paths = fs.readdirSync(folder)

    keys = []

    // Fill only in keys which is __not__ reserved.
    paths.forEach(item => {
      let info = fs.statSync(path.join(folder, item))
      // Only accept javascript files or folders.
      if (info.isDirectory()) {
        // Push item (folder name)
        keys.push(item)

        return
      }

      let ext = path.extname(item)

      if (ext !== '.js') return

      // Push item (basename of item)
      keys.push(path.basename(item, '.js'))
    })

    paths = undefined
  // Collect keys from object
  } else if (type === 'object') {
    keys = Object.keys(value)
  // Return on all other types
  } else {
    return
  }

  // Set flags
  connection._route = includes(keys, 'route')
  connection._worker = includes(keys, 'worker')

  // Clear previous keys
  connection._keys = {}

  // And insert the new keys
  keys.forEach(key => !includes(RESERVED, key) ? (connection._keys[key] = undefined) : 0)
}

function getKeys (connection) {
  if (connection._keys === undefined && connection.get('routes') !== undefined) {
    setKeys(connection, connection.get('routes'))
  }

  // Return keys from _keys if available
  return Object.keys(connection._keys || {})
}
