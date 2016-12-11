/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const debug = require('debug')('ccr:router:on-incoming')

const Request = require('./request')

/**
 * Handles all incoming comunication
 *
 * @private
 */
function onIncoming (connection) {
  // Be verbose while debugging
  debug('Opened for %s', connection._cluster ? 'Hub'
  : `Worker on Channel ${connection.channel}`)

  // Return event
  return (worker, message) => {
    // Only the hub knows the worker
    if (message === undefined) {
      message = worker
      worker = connection._worker
    }

    let key = message.key
    let who = connection.channel !== undefined
    ? 'Worker' : 'Hub'
    let channel = connection.channel !== undefined
    ? connection.channel : connection._channels[worker.id]

    // Only requests have a path defined.
    if (message.path !== undefined) {
      debug('%s got a request %s on Channel %s', who, key, channel)
      onRequest(connection, worker, message)
    } else {
      debug('%s got a response for %s on Channel %s', who, key, channel)
      onResponse(connection, message)
    }
  }
}
// Export function
module.exports = onIncoming

/**
 * Fires only on request messages
 */
function onRequest (connection, worker, message) {
  // Create a new request
  let req = new Request(connection, worker, message)

  // Set the final handler, hopefully we don't reach it.
  let done = err => {
    // Ignore ghost requests (handled requests without error)
    if (!err && req._sent) {
      debug('Ignoring ghost request')
      return
    }

    let type = err ? 'wronged' : 'unhandled'

    debug('Responding to %s request %s', type, req.key)

    // Print error if not testing
    if (err) {
      if (connection.get('env') !== 'test') {
        console.log(err)
      }

    // Exit here if request is sent
    } else if (req._sent) {
      debug('Can only respond if request %s is not sent', req.key)

      return

    // Unhandled request need a guide (error)
    } else {
      err = new Error('Cannot find ' + (req.originalPath || req.path))
    }

    // Send response
    debug('Sending respons for %s request %s', type, req.key)
    req.send(err)
  }

  // No routes defined
  if (!connection._router) {
    debug('Cannot respond to requests until after routes are defined')
    done()
    return
  }

  // Let router handle request
  connection._router.handle(req, done)
}

/**
 * Fires only on response messages
 */
function onResponse (connection, message) {
  let key = message.key

  // Only the hub routes responses
  if (message.channel && connection._cluster) {
    // Get channel from message
    let channel = message.channel
    delete message.channel

    // Get worker (id) for channel
    let worker = connection._workers[channel]

    // Be verbose when needed.
    debug('Forwarding response for %s to Channel %s', key, channel)

    // Forward message to the worker
    connection._cluster.workers[worker].send(message)
  // Only if we have a callback do we proceed.
  } else if (connection._worker && connection._callbacks[key]) {
    // Get fn from available callbacks
    let fn = connection._callbacks[key]
    delete connection._callbacks[key]

    // Check (only) begining of load for an error object
    message.load[0] = checkForError(message.load[0])

    // NOTE: Maybe implement a response object bound to `this` in callback?

    // Fire callback next
    process.nextTick(fn.bind.apply(fn, [fn].concat(message.load)))
  // Lost responses (while debugging)
  } else {
    debug('Lost response for request %s', key)
  }
}

/**
 * Check JSON-Object, and if an error is found returns the reconstructed Error.
 */
function checkForError (obj) {
  if (!obj || !obj.__error__) return obj

  let err = new Error(obj.message)
  err.name = obj.name
  err.stack = obj.stack

  Object.keys(obj).forEach(key => {
    if (!err[key] && key !== '__error__') {
      err[key] = obj[key]
    }
  })

  return err
}

/**
 * Forcefully convert Error to JSON-Object
 */
if (!Error.prototype.toJSON) {
  Error.prototype.toJSON = function () {
    let object = {
      name: this.name,
      message: this.message,
      stack: this.stack,
      __error__: true
    }

    // Add any custom properties such as .code in file-system errors
    Object.keys(this).forEach(key => {
      if (!object[key]) {
        object[key] = this[key]
      }
    })

    return object
  }
}
