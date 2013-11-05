/*jshint esnext: true */

var t = require('tap');
var Q = require('q');

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

var throws = genny.fn(function* $throws(t, message, resume) {
    if (t) {
        var ok = yield normal(resume());
        t.equals(ok, "OK", "yields before a throw");
    }
    throw message;
});

var return5 = genny.fn(function* $return5(resume) {
    return 5;
});

t.test(
    "simple test",
    genny.fn(function* (t, resume) {
        yield setImmediate(resume());
        t.ok(true, 'resume success');
        t.end();
    }));


t.test(
    "correct parallel order",
    genny.fn(function* (t, resume) {
        normal(resume());
        setImmediate(resume());
        var ok = yield resume, nothing = yield resume;
        t.equals(ok, 'OK')
        t.equals(nothing, undefined);
        t.end();
    }));

t.test(
    "throws error",
    genny.fn(function* (t, resume) {
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
        }, function(err, res) {
            t.ok(err, "error present");
            t.end();
        });
    });

t.test(
    "calls callback with return result on exit",
    function(t) {
        genny.run(function* (resume) {
            yield setImmediate(resume());
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
    genny.fn(function* (t, resume) {
        var arr = [];
        for (var k = 0; k < 10; ++k)
            arr.push(yield nowait(k, resume()));
        t.deepEquals(arr, [0,1,2,3,4,5,6,7,8,9], 'resumed all immediate calls');
        t.end();
    }));

t.test(
    "handles yields in/after a catch",
    genny.fn(function* $test(t, resume) {
        var types = [t, null];
        for (var i=0; i<types.length; i++)
            try {
                yield throws(types[i], "threw", resume());
            } catch (e) {
                t.equals(e, "threw", "catches things thrown");
                var res = yield return5(resume());
                t.equals(res, 5, "handles yields after throws");
            }
        t.end();
    }));

t.test(
    "handles yields in/after nested catches catch",
    genny.fn(function* (t, resume) {
        var types = [t, null];
        for (var i=0; i<types.length; i++)
            for (var j=0; j<types.length; j++)
                try {
                    yield throws(types[i], "threw", resume());
                } catch (e) {
                    t.equals(e, "threw", "catches things thrown");
                    try {
                        yield throws(types[j], "threw again", resume());
                    } catch (e) {
                        t.equals(e, "threw again", "catches things thrown again");
                        var res = yield return5(resume());
                        t.equals(res, 5, "handles yields after throws");
                    }
                }
        t.end();
    }));


t.test(
    "handles returns after a catch",
    genny.fn(function* (t, resume) {
        var done = genny.fn(function *(resume) {
            try {
                yield throws(t, "threw", resume());
            } catch (e) {
                t.equals(e, "threw", "catches things thrown");
                return "done";
            }
        });
        var z = yield done(resume());
        t.equals(z, "done", "handles return immediately after a catch");
        t.end();
    }));

t.test(
    "functions not passed a callback can catch thrown errors",
    genny.fn(function* (t, resume) {
        genny.run(function* (resume) {
            try {
                yield throws(t, "threw", resume());
            } catch (e) {
                t.equals(e, "threw", "caught a thrown error");
                t.end();
            }
        });
    }));

if (0) // can't legitimatly expect the thown error to be caught as the generator might be legitimately not running or even done by the time this gets thrown, so only a global catch will catch it.
t.test(
    "handles evil functions that run callbacks multiple times",
    genny.fn(function* (t, resume) {
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
    genny.fn(function* completeStackTrace(t, resume) {
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
    genny.fn(function* completeStackTrace2(t, resume) {

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
    "has a complete error when invoking generators w/o yield*",
    genny.fn(function* completeStackTraceUnstarred(t, resume) {

        function* innerGenerator1(resume) {
            yield errors(resume());
        }
        function* innerGenerator2(resume) {
            yield genny.fn(innerGenerator1)(resume());
        }
        function* innerGenerator3(resume) {
            yield genny.fn(innerGenerator2)(resume());
        }

        try {
            yield genny.fn(innerGenerator3)(resume());
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
    "has a complete error stack for thrown exceptions",
    genny.fn(function* completeStackTrace2(t, resume) {

        function* innerGenerator1(resume) {
            throw new Error("Whoopsy");
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
    genny.fn(function* (t, resume) {
        var res = yield multiresult(resume.nothrow());
            t.equals(res[0], null, 'first argument is error');
            t.equals(res[2], 'r2', 'third argument is r2');
            t.end();
        }));


t.test(
    "listener doesn't send results to callback",
    function(t) {
        genny.listener(function* (callback, resume) {
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
        genny.listener(function* (callback, resume) {
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
        genny.middleware(function* (req, res, next) {
            return true;
        })(t, t, function(err, res) {
            t.equals(res, undefined, 'listener has no result in callback');
            t.end();
        })
    });

t.test(
    "middleware does send errors to callback",
    function(t) {
        genny.middleware(function* (req, res, next) {
            throw new Error("Oops");
        })(t, t, function(err) {
            t.ok(err, 'middleware has error in callback');
            t.end();
        })
    });

/****************************************************
 * Promises and thunks
 ****************************************************/

var promiseTest = function promiseTest(err) {
    var d = Q.defer();
    setTimeout(function() {
        if (!err) d.resolve('as-promised');
        else d.reject(new Error("Fail"));
    }, 1);
    return d.promise;
};

t.test(
    "accepts promises",
    genny.fn(function* (t, resume) {
        var res = yield promiseTest();
        t.equals(res, 'as-promised', 'promise was handled');
        try {
            var err = yield promiseTest(true);
        } catch (e) {
            t.ok(e, 'Had error');
            t.end();
        }
    }));

t.test(
    "accepts thunks",
    genny.fn(function* (t) {
        var res = yield normal;
        t.equals(res, 'OK', 'thunk was handled');
        try {
            var err = yield errors;
        } catch (e) {
            t.ok(e, 'Had error');
            t.end();
        }
    }));

t.test(
    "accepts arrays",
    genny.fn(function* (t) {
        var multi = yield [normal, promiseTest()];
        t.equals(multi[0], 'OK');
        t.equals(multi[1], 'as-promised');
        t.end();
    }));
