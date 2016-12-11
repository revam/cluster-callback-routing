# Cluster Callback Routing
Basic IPC load routing with callbacks.

## About
This project was created as an experiment to test how I could utilize Clusters in Node, now shared in case others may find it useful.

It's basically a (wrapped and) modified [Express](https://github.com/expressjs/express) router acting as the central hub in a star network.
Every normal worker acts like a node requesting information from the central, which in turn requests information from the privileged workers for them to respond with the desired information.

If you want to find out all the what-s and how-s, take a look at the source code.

## Example usage
Let's explain how to use it with some examples.

### The (recommended) minimum

The recommended way to `CCR` is to create a folder with all your routes. (Default folder name is `routes` and is changeable.) It is also _recommended_ to include `route.js` and `worker.js` in the folder. `route.js` is the default *Route* and `worker.js`
 is the (multiple) worker script. (Example below.)

#### Example project structure
```
project-root
+-- app.js
`-- routes
  +-- route.js
  +-- route1.js
  +-- route2.js
  `-- worker.js
```

#### app.js

The smallest loader. (no-config with defaults)

```
// Load the library
require('cluster-callback-routing').start()
```

### Full one-file configuration

```

// All initialization methods are chainable.

// Load the library
require('cluster-callback-routing')

// Load initial options
.init({
  // Determine if worker restarts or throws on error. Defaults to true.
  respawn: false,

  // Amount of workers to spawn. Defaults to amount of CPU-cores on system.
  count: 1,

  // Routes { Object } form
  routes: {
    // Main connection (route)
    route: connection => {
      connection.add('path/callback', (req, next) => {
        console.log('%s : [ %s ]', req.path, req.load)

        // It is not necessary, but recommended, to reserve the first argument for errors.
        req.send(null, 'that')
      })

      // Example use with parameters in path
      connection.add('path/numbers/:num', (req, next) => {
        console.log('%s : [ %s ], [ %s ]', req.path, req.load, Object.keys(req.params))

        // As stated above, it is not necessary to reserve the first argument.
        req.send(req.params.num)
      })
    },

    // Worker(-s) connection (worker)
    worker: connection => {
      // Normal path to callback
      // load [ 'this' ]
      connection.request('path/callback', 'this', (err, that) => {
        console.log('%s, %s', err, that)
      })

      // In case sesitive mode, this path will produse an error
      // load [ ]
      connection.request('PATH/callback', (err, that) => {
        console.log('%s, %s', err, that)
      })

      // Example use with params in path
      // load [ ]
      connection.request('path/numbers/14', (number) => {
        console.log('Number: %s', number)
      })

      // By specifying the name of an unique worker can we send requests to them.
      // load [ 'pin' ]
      connection.request('priv1/path', 'pin', (err, pon, pan) => {
        if (err) {
          console.log(err)
          return
        }

        console.log('%s, %s', pon, pan)
      })
    },
    // `route` and `route` is reserved, and cannot be used as a privileged route.
    // Example privileged worker, with routing.
    priv1: {
      // All options in this object will be set in the root of the connection.
      'string value': 0 / 1,

      // Connection route
      route: connection => {
        // Se below for declaration
        console.log(connection.get('unique variable'))
        connection.add('path', (req, next) => {
          console.log('%s : [ %s ]', req.path, req.load)
          req.send(null, 'pon', 'pan')
        })
      }
    },

    // Can also be directly set as the function or as a path.
    priv2: connection => {
      console.log(connection.channel)
    },

    // Path must be absolute or relative to project root.
    priv3: 'path/to/file'
  },

  // Defaults to process.env.NODE_ENV or 'development'. (No need to set)
  env: 'test',

  // Sets the module root, defaults to project root. (No need to set)
  'module root': __dirname,

  // Whether or not strict. Defaults to false.
  'strict routing': false,

  // Defaults to true.
  'case sensitive routing': true
})

// It is possible to set one and one option with the #set() method
.set('one', 1)

// It is also possible to set parts of an object, or create a new object chain
.set('new object.new property', 'new value')

// Starts the route and connections
.start()

```

## TO-DOs
- Add option to pipe `stdout` of each child-process to it's own file in a customizable
  folder relative to project root.
  (Maybe a good idea to seperate the `stdout` of each process, as sometimes multiple
  writes to same `stdout` is conflicting to read both for man and machine.)
- Make some tests (How do we test this mess... I mean it's using multiple processes
  and only one instance per process... Anyone?..)
- Document the API (How?!)
- Better examples?

## Contributing


## License
This project is licensed under the MIT license, an example of the license can be found within the LICENSE.md file.
