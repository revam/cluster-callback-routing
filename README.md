# Cluster Callback Routing
[![npm version](https://img.shields.io/npm/v/cluster-callback-routing.svg?style=flat)](https://www.npmjs.com/package/cluster-callback-routing)

Basic routing through IPC with callback handling.

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
- [Routes](#routes)
	- [Names](#names)
	- [Object](#object)
	- [Folder](#folder)
- [API](#api)
- [Tests](#tests)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

<!-- /TOC -->

## Installation
```sh
npm install --save cluster-callback-routing
```

## Features
-   callback driven communication between workers and routes.
-   basic error handling (through IPC)
-   easy management of routes

## Introduction
It's basically hub in a [star network](https://en.wikipedia.org/wiki/Star_network), with many routes behind each own (modified) [Express Router](https://github.com/expressjs/express/tree/master/lib/router).

Every __worker__ acts like a node requesting information from the hub, which in turn requests information from __the defined routes__ for (one of) them to respond with the desired information.

__Note__: Remember to always start the work after configuring through __#start()__.

### Configuration
Run __#init()__ to set any options in a chain, or __#options()__ to get the complete `options` when additional options is sat.

```js
const connection = require('cluster-callback-routing')

.init({
  'env': <String>, // Runtime environment. Defaults to `process.env.NODE_ENV` if set or 'development'.
  'module root': <String>, // Module root. Defaults to project root (cwd).
  'count': <Number>, // Amount of workers to spawn. Defaults to amount of CPU-cores on system.
  'respawn': <Boolean>, // Determine if child-processes throws or restarts on error. Defaults to true.
  'routes': <Object or String>, // See #routes for details.
  'case sensitive routing': <Boolean>, // Whether or not to respect case sensitivity while routing. Does not apply to route names.

  // Any other fields are ignored and can be used as desired.
  'foo': 'bar',
  ...
})

let all_options = conneciton.options({ ... })
...
```

### The bare minimum
```js
require('cluster-callback-routing').init({ ... }).start()
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

## Routes
A Route is basically a Router you define routes for.

With the exception of `worker` do all routes only spawn one at a time.

There are two ways of setting routes; (1) as an object or (2) as a path (relative to project-root) to a folder.

### Names
A route name can be any name you want, except for `route` or `worker`, which is reserved as special routes. (Explained below)

`route`: The default route handler for all requests, but only if present. It is still possible to use CCR without a default handler.

`worker`: The worker route. It has no routing capabilities, and can be spawned more than one a t a time.

### Object
There are three ways to initialize routes as an object; (1) As a path, (2) directly, or (3) as an object containing the field `route`.

```js
...
.init({
  ...
  routes: {
    route: 'path/to/route', // It is possible to specify a path as a route.
    worker: connection => { // Or directly setting the route here.
      ...
    },
    route1: { // If you need variables for only one route,
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

### Folder
You put the routes in a folder, where the file- or folder names is used as the route name. And set the path in the `routes` field.

```js
...
.init({
  ...
  routes: 'path/to/routes', // You can choose any path you want, but it must lead to a folder.
  ...
})
...
```
## API
See the [API Reference](https://github.com/revam/cluster-callback-routing/wiki/API-Reference)  on the [Wiki](https://github.com/revam/cluster-callback-routing/wiki) for details on the API.

## Tests
Until some real tests are implemented, the file `test.js` will have a small test for humans to run.

## Contributing
If someone is interested in contributing, feel free to create a [PR](https://github.com/revam/cluster-callback-routing/pulls) or [Issue](https://github.com/revam/cluster-callback-routing/issues) on [GitHub](https://github.com/revam/cluster-callback-routing).

## Changelog
[Changelog here](./CHANGES.md)

## License
[MIT](./LICENSE)
