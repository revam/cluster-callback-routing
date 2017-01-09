# Cluster Callback Routing
[![npm version](https://img.shields.io/npm/v/cluster-callback-routing.svg?style=flat)](https://www.npmjs.com/package/cluster-callback-routing) [![github tag](https://img.shields.io/github/tag/revam/cluster-callback-routing.svg?style=flat)](https://www.github.com/revam/cluster-callback-routing)

Basic inter-process routing with callback handling.

Shared in case others may find it useful.

## Table of Contents

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Features](#features)
- [Introduction](#introduction)
	- [Configuration](#configuration)
	- [The bare minimum](#the-bare-minimum)
	- [Recommended project structure](#recommended-project-structure)
- [Connections](#connections)
	- [Special connection routes](#special-connection-routes)
	- [Initialize as an object](#initialize-as-an-object)
	- [Initialize as a path](#initialize-as-a-path)
- [Routing](#routing)
	- [`route()`](#route)
	- [`request()`](#request)
	- [`router()`](#router)
- [Tests](#tests)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)
- [See also](#see-also)

<!-- /TOC -->

## Installation
```sh
npm install --save cluster-callback-routing
```

## Features
-   callback driven communication between connections
-   basic error handling (through IPC)
-   easy management of routes
-   routers

## Introduction
(Needs a proper introduction)

### Configuration
Run `init()` to set any options in a chain, or `options()` to get the options object when additional options is sat. Any configuration must be done before `start()` is invoked.

__Note__: Remember to always start the work through `start()`.

```js
const connection = require('cluster-callback-routing')

.init({
  'env': <String>, // Runtime environment. Defaults to `process.env.NODE_ENV` if set or 'development'.
  'module root': <String>, // Module root. Defaults to project root (cwd).
  'count': <Number>, // Amount of workers to spawn. Defaults to amount of CPU-cores on system.
  'respawn': <Boolean>, // Determine if child-processes throws or restarts on error. Defaults to true.
  'routes': <Object or String>, // See #connections for details.
  'case sensitive routing': <Boolean>, // Whether or not to respect case sensitivity while routing. Does not apply to route names. Defaults to true.

  // Any other fields are ignored and can be used freely.
  'foo': 'bar',
  ...
})

let all_options = conneciton.options({ ... })
...
```

### The bare minimum
If you're okay with defaults, then you can just invoke `start()`.

```js
require('cluster-callback-routing').start()
```

### Recommended project structure
```
project
+-- index.js
`-- routes
  +-- route.js
  +-- route1.js
  +-- route2.js
  `-- worker.js
```

## Connections
A connection route is a child-process communicator used to manage routes or send requests. A connection must have an unique name and will only spawn one at a time. The exception to this is the special connection `worker`, as explained below.
You can choose to use any valid string as a name, except names associated with special connection routes.

You can either declare your routes (1) in an object or (2) as a path. _It is recommended to use the latter._

### Special connection routes
Both special routes are optional to use.

`route`: The default (request) routes handler for all requests, if present. If no default handler is set, then any requests not specifying a (connection) receiver will rebounce.

`worker`: As opposed to a normal route has no routing capabilities, but in return can spawn more than one at a time.

### Initialize as an object
There are three ways to initialize routes in an object; (1) As a path, (2) directly, or (3) within an object with the field `route`.

```js
...
.init({
  ...
  routes: {
    route: 'path/to/route', // It is possible to specify a path to require,
    worker: connection => { // directly setting the route here,
      ...
    },
    route1: { // Or if you need variables initialized for a single route,
      var1: 'only accessible for route1', // you can set them enclosed in an object,
      route: connection => { // where 'route' is the handler for the route.
      	...
      }
    }
  },
  ...
})
...
```

### Initialize as a path
It is possible to specify the path to a folder with scripts. __Javascript files__ and __folders__ directly after the specified path will then be used as routes. Route name according to filename or folder name.

```js
...
.init({
  ...
  routes: 'path/to/routes', // You can choose any path you want, but it must lead to a folder.
  ...
})

...

.init({
	...
	routes: './path/to/routes', // This is equal to the above statement.
  ...
})

...

.init({
	...
	routes: '/absolute/path/to/routes', // It is also possible to use an absolute path.
  ...
})
...
```

## Routing
Below are some brief explanations about the basic routing methods.

See the [API Reference](https://github.com/revam/cluster-callback-routing/wiki/API-Reference) on the [Wiki](https://github.com/revam/cluster-callback-routing/wiki) for more in-depth details of the API.

### `route()`
A route is a path with one or more callbacks tied to it. Requests will try to match against each route you define.

For more details, see the [wiki page](#). (page needed)

```js
...
// Defining a route
connection.route('path/to/callback', (req, next) => {
	...
})
...
```

### `request()`
When we want to do some work on another connection, we make a request. It is possible to attach a _JSON-friendly_ load with the request.

It is _recommended_, but not needed, to reserve the first argument in all callbacks for error handling.

For more details, see the [wiki page](#). (page needed)

```js
...
// We can send plain requests without any load,
connection.request('path/to/callback/without/load', (err, result) => {
	...
})
...
// wrap it in an array,
connection.request('path/to/callback/with/load', ['any', 'var', 0], (err, result) => {
	...
})
...
// or add it directly.
connection.request('path/to/callback', 'any', 'var', 0, (err, result) => {
  ...
})
...
```

To choose a different connection then the default, use the connection name as the first part of the path.

```js
...
connection.request('/route1/path/to/callback', (err, result) => {
	...
})
...
```

### `router()`
An extension of the routing interface. Has a variety of uses.
An instance can be acquired on any connection capable of routing.

Router is based on [Express Router](https://github.com/expressjs/express/tree/master/lib/router).

For more details, see the [wiki page](#). (page needed)

```js
...

console.log('Can %s spawn new router: ', connection.key, typeof connection.Router === 'function')

if (connection.key !== 'worker') {
  let router = connection.router({
    caseSensitive: <Boolean> // Same as global 'case sensitive routing' or sat here.
  })
  ...
}
...
```

Using a router is as simple as binding it to a route path.
```js
...
// Get an instance
let router = connection.router({ ... })

...

// Bind it to a path.
connection.route('/some-router', router)
...
```

## Tests
Until some real tests are added will the file `test.js` have a small test for humans to run.

## Contributing
If someone is interested in contributing, feel free to create a [PR](https://github.com/revam/cluster-callback-routing/pulls) or [Issue](https://github.com/revam/cluster-callback-routing/issues) on [GitHub](https://github.com/revam/cluster-callback-routing).

## Changelog
[Changelog here](./CHANGES.md)

## License
[MIT](./LICENSE)

## See also
-   [Express](https://github.com/expressjs/express) - used their routing logic as a starting point.
