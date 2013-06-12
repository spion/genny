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
  setTimeout(cb.bind(null, "OK"), 20);
}

t.test(
  "simple test", 
  genny(function* (resume, t) {
    yield setImmediate(resume.throw);
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
      yield errors(resume());
    })(function(err) {
      t.ok(err, "error present");
      t.end();
    })
  });


t.test(
  "handles nowait in a loop",
  genny(function* (resume, t) { 
    for (var k = 0; k < 3; ++k)
      yield nowait(k, resume.throw);
    t.end();
  }));

t.test(
  "handles evil functions that run callbacks multiple times",
  genny(function* (resume, t) {
    yield evil(resume);
    var res = yield normal(resume.throw);
    t.equals(res, "OK");
  }));

