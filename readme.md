# ps

A Node.js module for looking up running processes.

## Install

```bash
$ npm install ps-node
```

## Usage

Lookup process with spicified `pid`:

```javascript
var ps = require('ps-node');

// A simple pid lookup
ps.lookup({ pid: 12345 }, function(err, resultList ) {
    if (err) {
        throw new Error( err );
    }

    var process = resultList[ 0 ];

    if( process ){

        console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
    }
    else {
        console.log( 'No such process found!' );
    }
});

```

Or use RegExp to filter `command` and `arguments`:

```javascript
var ps = require('ps-node');

// A simple pid lookup
ps.lookup({
    command: 'node',
    arguments: '--debug',
    }, function(err, resultList ) {
    if (err) {
        throw new Error( err );
    }

    resultList.forEach(function( process ){
        if( process ){

            console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
        }
    });
});

```

Also, you can use `kill` to kill process by `pid`:

```javascript
var ps = require('ps-node');

// A simple pid lookup
ps.kill( '12345', function( err ) {
    if (err) {
        throw new Error( err );
    }
    else {
        console.log( 'Process %s has been killed!', pid );
    }
});
```

You can also pass arguments to `ls` with `psargs`:

```javascript
var ps = require('ps-node');

// A simple pid lookup
ps.lookup({
    command: 'node',
    psargs: 'ux'
    }, function(err, resultList ) {
    if (err) {
        throw new Error( err );
    }

    resultList.forEach(function( process ){
        if( process ){
            console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
        }
    });
});

```
