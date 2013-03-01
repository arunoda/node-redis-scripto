[![Build Status](https://travis-ci.org/arunoda/node-redis-scripto.png)](https://travis-ci.org/arunoda/node-redis-scripto)
node-redis-scripto
==================

### Intelligent Redis Lua Script Manager for NodeJS

* Lua Scripting on Redis (2.6+) is a killer feature
* But using them with NodeJs is painful
* We've to maintain lua script in JavaScript as string or load them via the filesystem manually
* If we are looking at network performance, we've to manually invoke `script load` and `evasha` manually

## Scripto manages lua scripts for you

* You can place lua script in a directory
* Just tell the `dirname` to `scripto`, it will take care of lua scripts

~~~js
    var Scripto = require('redis-scripto');
    var scriptManager = new Scripto(redisClient);
    scriptManager.loadFromDir('/path/to/lua/scripts');

    var keys    = ['keyOne', 'keyTwo'];
    var values  = [10, 20];
    scriptManager.run('your-script', keys, values, function(err, result) {

    });
~~~

## Scripto is intelligent

* By default `scripto` tries to load scripts into redis (via `script load`)
* While scripts are loading, if a script invoked with `.run()` it will use `eval` and send the plaintext lua script to redis
* After scripts loaded, if a script invoked with `.run()` it will use `evalsha` and does not send plaintext lua script 
* If the connection to redis dropped, it will remove shas and try again to load scripts once it back online

## You've the control with Scripto

* if you need to send the plaintext lua script always. use `.eval()` method

~~~js
    scriptManager.eval('your-script', keys, values, function(err, result) {

    });
~~~

* If you just need to load a single script, see following example

~~~js
    var scriptManager = new Scripto(redisClient);
    scriptManager.loadFromFile('script-one', '/path/to/the/file');
    scriptManager.run('script-one', [], [], function(err, result) {

    });
~~~

* If you need to load scripts just using JavaScript (without loading from the filesystem), see following example.

~~~js
    var scripts = {
        'script-one': 'return 1000'
    };

    var scriptManager = new Scripto(redisClient);
    scriptManager.load(scripts);
    scriptManager.run('script-one', [], [], function(err, result) {

    });
~~~