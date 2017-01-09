// All initialization methods are chainable.

// Load the library
const connection = require('.')

// Load initial options
connection.init({
  // Amount of workers to spawn. Defaults to amount of CPU-cores on system.
  // Recommended to set to 1 or 2 under development.
  count: 1,

  // Determine if worker restarts or throws on error. Defaults to true.
  // Recommended to turn off under development.
  respawn: false,

  // All variables set here are accessible to all instances.
  var2: 'Yes Sir!',

  // Easily extend  path from project root with #extendPath()
  path1: connection.extendPath('path1'),

  // Works with more than one given paths.
  path2: connection.extendPath('path2', 'some/more/path'),

  // #expandPath() is an alias to #extendPath()
  path3: connection.expandPath('path3'),

  // Routes { Object } form
  routes: {
    // Default route
    // Recommended to include.
    route: (connection) => {
      // `var1` will only be available to route `priv1`
      console.log('route:', connection.get('var1', 'No variable here.'))
      console.log('route:', connection.get('var2', 'Still no.'))

      connection.route('path/callback', (req, next) => {
        console.log('%s : [ %s ]', req.path, req.load)

        // It is not necessary, but recommended, to reserve the first argument for errors.
        req.send(null, 'that')
      })

      // Example use with parameters in path
      connection.route('numbers/:num', (req, next) => {
        console.log('%s : [ %s ], [ %s ]', req.path, req.load, Object.keys(req.params))

        // As stated above, it is not necessary to reserve the first argument.
        req.send(req.params.num)
      })
    },

    // Worker routes.
    // Recommended to include.
    worker: (connection) => {
      let counter = 0
      // Exit when all four requests have returned.
      function checkCounter (int) {
        if (int >= 4) {
          console.log('End of test\n')
          process.exit()
        }
      }

      // Normal path to callback
      // load [ 'this' ]
      connection.request('path/callback', 'this', (err, that) => {
        if (err) {
          console.log('got', err)
        } else {
          console.log('got', that)
        }

        console.log(connection.extendPath('../asdasd', './dsff/dfgfdg', '.././a'))

        checkCounter(++counter)
      })

      // In case sesitive mode, this path will produse an error
      // load [ ]
      connection.request('PATH/callback', (err, that) => {
        if (err) {
          console.log('produced an error as expected')
        } else {
          console.log('produc- wait, what?')
        }

        checkCounter(++counter)
      })

      // Example use with parameters in path
      // load [ ]
      connection.request('numbers/14', (number) => {
        console.log('Number: %s', number)

        checkCounter(++counter)
      })

      // By specifying the name of an unique worker can we send requests to them.
      // load [ 'pin' ]
      connection.request('priv1/path', 'pin', (err, pon, pan) => {
        if (err) {
          console.log(err)
        } else {
          console.log('%s, %s', pon, pan)
        }

        checkCounter(++counter)
      })
    },

    // Example privileged worker, with routing.
    priv1: {
      var1: 'It really is a variable here!',

      route: (connection) => {
        // `var1` will only be available to route `priv1`
        console.log('priv1:', connection.get('var1', 'No variable here.'))
        console.log('priv1:', connection.get('var2', 'Still no.'))

        connection.route('path', (req, next) => {
          console.log('%s : [ %s ]', req.path, req.load)
          req.send(null, 'pon', 'pan')
        })
      }
    },

    // Can also be directly set as the function or as a path.
    priv2: (connection) => {
      console.log('Private 2 on channel %s', connection.channel)
    },

    // Path must be absolute or relative to project root.
    priv3: 'priv3'
  }
})

// It is possible to set one and one option with the #set() method
.set('one', 1)

// It is also possible to set parts of an object, or create a new object chain
.set('new object', {
  property: true
})

.set('new object.new property', 'new value')

// Starts the route and connections
.start()
