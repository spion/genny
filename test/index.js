var t = require('tap');

var genny = require('../');

function errors(cb) {
    setImmediate(function() {
        cb(new Error('oops'))
    });
}

function nowait(k, cb) {
    cb(null, k);
}

function evil(cb) {
    setTimeout(function() {
        cb(null, 'EVIL') 
    }, 10);
    setImmediate(function() {
        cb(null, 'EVIL')
    });
}

function normal(cb) {
    setTimeout(function() {
        cb(null, "OK") 
    }, 30);
}

function multiresult(cb) {
    setImmediate(function() {
        cb(null, 'r1', 'r2')
    });
}


t.test(
    "simple test", 
    genny.fn(function* (resume, t) {
        yield setImmediate(resume());
        t.ok(true, 'resume success');
        t.end();    
    }));

t.test(
    "throws error", 
    genny.fn(function* (resume, t) {
        try {
            yield errors(resume());
        } catch (e) {
            t.ok(e, "error was thrown");
            t.end();
        }
    }));

t.test(
    "calls callback if present instead of throwing + genny.run", 
    function(t) { 
        genny.run(function* (resume) {
            yield errors(resume());
        }, function(err) {
            t.ok(err, "error present");
            t.end();
        });
    });

t.test(
    "calls callback with return result on exit", 
    function(t) { 
        genny.run(function* (resume) {
            return 1;
        }, function(err, res) {
            t.equals(res, 1, "result present");
            t.end();
        });
    });


t.test(
    "calls callback with return result on exit when return is after a yield", 
    function(t) { 
        genny.run(function* (resume) {
            var x = yield normal(resume.t);
            return x == "OK";
        }, function(err, res) {
            t.ok(res, "result is true");
            t.end();
        });
    });



t.test(
    "handles functions that immediately call the callback in the same tick",
    genny.fn(function* (resume, t) { 
        var arr = [];
        for (var k = 0; k < 10; ++k)
            arr.push(yield nowait(k, resume.t));
        t.deepEquals(arr, [0,1,2,3,4,5,6,7,8,9], 'resumed all immediate calls');
        t.end();
    }));

t.test(
    "handles evil functions that run callbacks multiple times",
    genny.fn(function* (resume, t) {
        try {
            yield evil(resume.t);
            var res = yield normal(resume.t);
        } catch (e) {
            t.ok(e, "evil functions cause throw");
            t.end();
        }
    }));

t.test(
    "resume.nothrow yields arrays",
    genny.fn(function* (resume, t) {
        var res = yield multiresult(resume.nothrow());
            t.equals(res[0], null, 'first argument is error');
            t.equals(res[2], 'r2', 'third argument is r2');
            t.end();
        }));

t.test(
    "listener doesnt send results to callback",
    function(t) {
        genny.listener(function* (resume, t, callback) {
            setImmediate(callback);
            return true; 
        })(t, function(err, res) {
            t.notOk(res, 'listener has no result in callback');
            t.end();
        })
    });

