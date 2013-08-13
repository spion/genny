var t = require('tap');


var genny = require('../');

genny.longStackSupport = true;

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
            var x = yield normal(resume());
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
            arr.push(yield nowait(k, resume()));
        t.deepEquals(arr, [0,1,2,3,4,5,6,7,8,9], 'resumed all immediate calls');
        t.end();
    }));

t.test(
    "handles evil functions that run callbacks multiple times",
    genny.fn(function* (resume, t) {
        try {
            yield evil(resume());
            var res = yield normal(resume());
        } catch (e) {            
            t.ok(e, "evil functions cause throw");
            t.end();
        }
    }));

t.test(
    "has a complete error stack",
    genny.fn(function* completeStackTrace(resume, t) {
        try {
            yield errors(resume());
        } catch (e) {
            t.ok(~e.stack.indexOf('completeStackTrace'), 
                 "error stack is complete");
            t.end();
        }
    }));


t.test(
    "has a complete error stack even when invoking generators",
    genny.fn(function* completeStackTrace2(resume, t) {

        function* innerGenerator1(resume) {
            yield errors(resume());
        }
        function* innerGenerator2(resume) {
            yield* innerGenerator1(resume.gen());
        } 
        function* innerGenerator3(resume) {
            yield* innerGenerator2(resume.gen());
        }
        try {
            yield* innerGenerator3(resume.gen());
        } catch (e) {
            //console.log(e.stack);
            t.ok(~e.stack.indexOf('innerGenerator1'), 
                 "stack contains inner generator 1");
            t.ok(~e.stack.indexOf('innerGenerator3'), 
                 "stack contains inner generator 3");
 
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
    "listener doesn't send results to callback",
    function(t) {
        genny.listener(function* (resume, callback) {
            setTimeout(callback, 1);
            return "resultFromGenerator"; 
        })(function(err, res) {
            t.equals(res, undefined, 'listener has no result in callback');
            t.end();
        })
    });

t.test(
    "listener doesn't send errors to callback",
    function(t) {
        genny.listener(function* (resume, callback) {
            setTimeout(callback, 1);
            throw new Error("ErrorFromGenerator");
        })(function(err) {
            t.notOk(err, 'listener has no error in callback');
            t.end();
        })
    });



t.test(
    "middleware doesn't send results to callback",
    function(t) {
        genny.middleware(function* (resume, req, res, next) {
            return true;
        })(t, t, function(err, res) {
            t.equals(res, undefined, 'listener has no result in callback');
            t.end();
        })
    });

t.test(
    "middleware does send errors to callback",
    function(t) {
        genny.middleware(function* (resume, req, res, next) {
            throw new Error("Oops");
        })(t, t, function(err) {
            t.ok(err, 'middleware has error in callback');
            t.end();
        })
    });

