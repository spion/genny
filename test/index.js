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
    genny(function* (resume, t) {
        yield setImmediate(resume.throw);
        t.ok(true, 'resume success');
        t.end();    
    }));

t.test(
    "throws error", 
    genny(function* (resume, t) {
        try {
            yield errors(resume.throw);
        } catch (e) {
            t.ok(e, "error was thrown");
            t.end();
        }
    }));

t.test(
    "calls callback if present instead of throwing", 
    function(t) { 
        genny(function* (resume, t) {
            yield errors(resume.throw);
        })(function(err) {
            t.ok(err, "error present");
            t.end();
        })
    });


t.test(
    "handles nowait in a loop",
    genny(function* (resume, t) { 
        for (var k = 0; k < 10; ++k)
        yield nowait(k, resume.throw);
        t.ok(true, 'resumed all nowait yields');
        t.end();
    }));

t.test(
    "handles evil functions that run callbacks multiple times",
    genny(function* (resume, t) {
        yield evil(resume.throw);
        var res = yield normal(resume.throw);
        t.equals(res, "OK", 'got result from non-evil function');
        t.end();
    }));

t.test(
    "supports multi-result functions",
    genny(function* (resume, t) {
        var res = yield multiresult(resume.throw);
        t.equals(res[0], 'r1', 'first result is there');
        t.equals(res[1], 'r2', 'second result is there');
        t.end();
    }));

t.test(
    "supports no-throw variant",
    genny(function* (resume, t) {
        var res = yield multiresult(resume.nothrow);
            t.equals(res[0], null, 'first argument is error');
            t.equals(res[2], 'r2', 'third argument is r2');
            t.end();
        }));
