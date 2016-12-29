# Changelog

## 1.2.0
-   Added support for folders as routes (via. index.js)

    Made it load `index.js` of folders found in routes folder, making it easier to organize when a route is split over multiple files.
    ```
    project
    +-- index.js
    `-- routes
      +-- route.js
      +-- route1           <- made this possible
      | +-- index.js
      | +-- route1sub1.js
      | `-- route1sub2.js
      +-- route2.js        <- and not just this
      `-- worker.js
    ```

-   Moved check for \[if response is sent\] so it will always be checked.
-   Added a new debug message for when a response is opened.
-   Fixed(changed) some debug messages
-   Minor fixes in comments.

## 1.1.1
-   #extendPath(): support for more than one arguments.
-   Removed unnecessary code

## 1.1.0
-   New method #extendPath() for routes and workers

## 1.0.2
-   Fixed initialization of defaults.

## 1.0.1
-   Fixed require for routes

## 1.0.0
-   Initial release
