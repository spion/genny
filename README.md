# genny

A tiny ES6 (harmony) library for node 0.11.2 and up that helps you 
use generators with node style callbacks, similar to 
[suspend](https://github.com/jmar777/suspend)

# usage examples

Call your async functions with yield and pass them a resume function:

```js
genny(function* (resume) {
    console.log("Hello");
    yield setInterval(resume(), 1000);
    console.log("World");
})();
```

Handle errors with `try`/`catch`, or as return results via
`resume.nothrow`

```js
function errors(cb) {
    setImmediate(cb.bind(this, new Error('oops')));
}

genny(function* (resume) {

    try { yield errors(resume()); } 
    catch (e) { /* handle the oops error */ }

    var err = yield errors(resume.nothrow());
    if (err) { /* handle oops error */ }

})();

```
Dont like nested parens? Want to keep things brief? Use `resume.t` 
instead of `resume()` and `resume.nt` instead of `resume.nothrow()`

Want to catch all uncaught exceptions? You can pass a callback to
your newly created genny function. Infact, you can pass other arguments
too, and they will be passed to your generator right after `resume`.

```js
genny(function* (resume, arg1) {
    assert.equal(arg1, 'arg1', 'argument passed')
    var err = yield errors(resume.t);
})('arg1', function(err) {
    // handle oops error
});
```

note: make sure that you pass the callback last.

Your async functions call the callback with more than 2 arguments?
Not a problem - genny will yield an array instead

```js
function returnsmore(callback) {
    callback(null, 'arg1', 'arg2');
}

genny(function* (resume) {
    var res = yield returnsmore(resume.t);
    var arg1 = res[0];
    var arg2 = res[1];
    var nothrowres = yield returnsmore(resume.nt);
    var err = res[0];
    var arg1 = res[1];
    var arg2 = res[2];
});
```

Look in `test/index.js` for more examples and tests.

# thanks

[jmar777](https://github.com/jmar777) for his awesome 
[suspend](https://github.com/jmar777/suspend) library which served 
as the base for genny

# licence 

MIT

