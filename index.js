/*! Copyright (c) 2016 Mikal Stordal | MIT Licensed */
'use strict'

/**
 * Module dependencies.
 *
 * @private
 */
const path = require('path')
const cluster = require('cluster')
const Connection = cluster.isMaster
  ? require('./lib/hub')
  : process.env.CCR_KEY
  ? require('./lib/route')
  : require('./lib/worker')

/**
 * Credits to the Keystone JS Team. Go read [here](https://raw.githubusercontent.com/keystonejs/keystone/master/index.js) if you want to know why it's used.
 */
const moduleRoot = (function (_rootPath) {
  let parts = _rootPath.split(path.sep)
  parts.pop() // get rid of /node_modules from the end of the path
  return parts.join(path.sep)
})(module.parent ? module.parent.paths[0] : module.paths[0])

// Export a new Connection
module.exports = exports = new Connection(cluster, moduleRoot)
