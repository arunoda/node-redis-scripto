var path        = require('path');
var assert      = require('assert');
var redis       = require('redis');
var Scripto     = require('../');

var redisClient = redis.createClient();
var scriptDir   = path.resolve(path.dirname(__filename), 'scripts');

suite('Scripto', function() {

    suite('eval', function() {

        test('running normally', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);
            s.eval('read-write', ['helloKey'], [200], function(err, result) {

                assert.equal(err, null);
                assert.equal(result, 200);
                done();
            });
        }));

        test('running non-existing script', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);
            s.eval('no-such-script', ['helloKey'], [200], function(err, result) {

                assert.equal(err.message, 'NO_SUCH_SCRIPT');
                assert.equal(result, undefined);
                done();
            });
        }));
    });

    suite('evalSha', function() {

        test('failed at initial call', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);
            s.evalSha('read-write', ['helloKey'], [200], function(err, result) {

                assert.equal(err.message, 'NO_SUCH_SCRIPT_SHA');
                assert.equal(result, undefined);
                done();
            });
        }));

        test('success at runs after script loaded (some millis later)', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);

            setTimeout(function() {
                
                s.evalSha('read-write', ['hello2Key'], [300], afterEvalSha);
            }, 100);

            function afterEvalSha(err, result) {

                assert.equal(err, undefined);
                assert.equal(result, 300);
                done();
            }
        }));
    });

    suite('run', function() {

        test('success at initial call', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);
            s.run('read-write', ['helloKey'], [200], function(err, result) {

                assert.equal(err, undefined);
                assert.equal(result, 200);
                done();
            });
        }));

        test('success at runs after script loaded (some millis later, then uses sha)', _clean(function(done) {
            
            var s = new Scripto(redisClient);
            s.loadFromDir(scriptDir);

            setTimeout(function() {
                
                s.run('read-write', ['hello2Key'], [300], afterEvalSha);
            }, 100);

            function afterEvalSha(err, result) {

                assert.equal(err, undefined);
                assert.equal(result, 300);
                done();
            }
        }));
    });

    test('load scripts from an object', _clean(function(done) {

        var scripts = { 'script-one': 'return 1000;' };
        var s = new Scripto(redisClient);
        s.load(scripts);

        s.run('script-one', [], [], function(err, result) {

            assert.equal(err, null);
            assert.equal(result, 1000);
            done();
        });

    }));

    test('load a script from file', _clean(function(done) {

        var s = new Scripto(redisClient);
        s.loadFromFile('read-write', path.resolve(scriptDir, 'read-write.lua'));

        s.run('read-write', ['helloKey'], [200], function(err, result) {

            assert.equal(err, null);
            assert.equal(result, 200);
            done();
        });

    }));

});

function _clean(callback) {

    return function(done) {

        redisClient.flushdb(function(err) {

            if(err) throw err;
            callback(done);
        });
    };
}