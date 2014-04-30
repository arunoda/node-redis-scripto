var fs      = require('fs');
var path    = require('path');
var debug   = require('debug')('scripto');

function Scripto (redisClient) {
    
    var scripts = {};
    var scriptShas = this._scriptShas = {};

    this.load = function load(scriptObject) {

        mergeObjects(scripts, scriptObject);
        loadScriptsIntoRedis(redisClient, scriptObject, afterShasLoaded);
    };

    this.loadFromFile = function loadFromFile(name, filepath) {

        var loadedScripts = {};
        loadedScripts[name] = fs.readFileSync(filepath, 'utf8');
        this.load(loadedScripts);
    };

    this.loadFromDir = function loadFromDir(scriptsDir) {

        var loadedScripts = loadScriptsFromDir(scriptsDir);
        this.load(loadedScripts);
    };


    this.run = function run(scriptName, keys, args, callback) {

        if(scripts[scriptName]) {  
            if(scriptShas[scriptName]) {
                var sha = scriptShas[scriptName];
                evalShaScript(redisClient, sha, keys, args, callback);
            } else {
                var script = scripts[scriptName];
                evalScript(redisClient, script, keys, args, callback);
            }
        } else {
            callback(new Error('NO_SUCH_SCRIPT'));
        }
    };

    this.eval = function eval(scriptName, keys, args, callback) {

        if(scripts[scriptName]) {
            var script = scripts[scriptName];
            evalScript(redisClient, script, keys, args, callback);
        } else {
            callback(new Error('NO_SUCH_SCRIPT'));
        }
    };

    this.evalSha = function evalSha(scriptName, keys, args, callback) {

        if(scriptShas[scriptName]) {
            var sha = scriptShas[scriptName];
            evalShaScript(redisClient, sha, keys, args, callback);
        } else {
            callback(new Error('NO_SUCH_SCRIPT_SHA'));
        }
    };

    //load scripts into redis in every time it connects to it
    redisClient.on('connect', function() {

        debug('loading scripts into redis again, aftet-reconnect');
        loadScriptsIntoRedis(redisClient, scripts, afterShasLoaded);
    }); 

    //reset shas after error occured
    redisClient.on('error', function(err) {

        var errorMessage = (err)? err.toString() : "";
        debug('resetting scriptShas due to redis connection error: ' + errorMessage);
        scriptShas = {};
    });   

    function afterShasLoaded(err, shas) {

        if(err) {
            debug('scripts loading failed due to redis command error: ' + err.toString());
        } else {
            debug('loaded scriptShas');
            mergeObjects(scriptShas, shas);
        }
    }

    function mergeObjects (obj1, obj2) {
        
        for(var key in obj2) {
            obj1[key] = obj2[key];
        }
    }

}

module.exports = Scripto;

function loadScriptsFromDir(scriptsDir) {

    var names = fs.readdirSync(scriptsDir);
    var scripts = {};

    names.forEach(function(name) {

        var filename = path.resolve(scriptsDir, name);
        var key = name.replace('.lua', '');

        scripts[key] = fs.readFileSync(filename, 'utf8');
    });

    return scripts;
}

function loadScriptsIntoRedis (redisClient, scripts, callback) {

    var cnt = 0;
    var keys = Object.keys(scripts);
    var shas = {};

    (function doLoad() {

        if(cnt < keys.length) {
            var key = keys[cnt++];

            redisClient.send_command('script', ['load', scripts[key]], function(err, sha) {

                if(err) {
                    callback(err);
                } else {
                    shas[key] = sha;
                    doLoad();
                }
            });
        } else {
            callback(null, shas);
        }

    })();
}

function evalScript(redisClient, script, keys, args, callback) {

    var keysLength= keys.length || 0;
    var arguments = [keysLength].concat(keys, args);
    arguments.unshift(script);

    redisClient.send_command('eval', arguments, callback);
}

function evalShaScript(redisClient, sha, keys, args, callback) {

    var keysLength= keys.length || 0;
    var arguments = [keysLength].concat(keys, args);
    arguments.unshift(sha);

    redisClient.send_command('evalsha', arguments, callback);
}