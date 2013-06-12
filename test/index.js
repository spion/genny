var t = require('tap');

var genny = require('../');

function errors(cb) {
    setImmediate(cb.bind(this, new Error('oops')));
}

function nowait(k, cb) {
    cb(null, k);
}

function evil(cb) {
    setTimeout(cb, 10);
    setImmediate(cb);
}

function normal(cb) {
    setTimeout(cb.bind(this, null, "OK"), 20);
}

function multiresult(cb) {
    setImmediate(cb.bind(this, null, 'r1', 'r2'));
}

t.test(
    "simple test", 
    genny(function* (t, resume) {
        yield setImmediate(resume());
        t.ok(true, 'resume success');
        t.end();    
    }));

t.test(
    "throws error", 
    genny(function* (t, resume) {
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
    "handles functions that immediately call the callback in the same tick",
    genny(function* (t, resume) { 
        var arr = [];
        for (var k = 0; k < 10; ++k)
            arr.push(yield nowait(k, resume.t));
        t.deepEquals(arr, [0,1,2,3,4,5,6,7,8,9], 'resumed all immediate calls');
        t.end();
    }));

t.test(
    "handles evil functions that run callbacks multiple times",
    genny(function* (t, resume) {
        yield evil(resume());
        var res = yield normal(resume());
        t.equals(res, "OK", 'got result from non-evil function');
        t.end();
    }));

t.test(
    "supports multi-result functions",
    genny(function* (t, resume) {
        var res = yield multiresult(resume());
        t.equals(res[0], 'r1', 'first result is there');
        t.equals(res[1], 'r2', 'second result is there');
        t.end();
    }));

t.test(
    "resume.nothrow yields arrays",
    genny(function* (t, resume) {
        var res = yield multiresult(resume.nothrow());
            t.equals(res[0], null, 'first argument is error');
            t.equals(res[2], 'r2', 'third argument is r2');
            t.end();
        }));

