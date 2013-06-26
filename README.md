# genny

A tiny ES6 (harmony) library for node 0.11.2 and up that helps you 
use generators with node style callbacks, similar to 
[suspend](https://github.com/jmar777/suspend)

# usage examples

Spawn a generator task. From within your task, call your async 
functions with yield and pass them a resume function instead of
a callback:

```js
genny.run(function* (resume) {
    console.log("Hello");
    yield setInterval(resume(), 1000);
    console.log("World");
});
```

Handle errors with `try`/`catch`, or as return results via
`resume.nothrow`

```js
genny.run(function* (resume) {
    // Throwing resume
    try { yield fs.readFile("test.js", resume()); } 
    catch (e) { /* handle the error */ }
    // Non-throwing resume always results with an array
    var err_res = yield fs.readFile("test.js", resume.nothrow());
    if (err_res[0]) { /* handle error */ }
});

```
Dont like nested parens? Want to keep things brief? Use `resume.t` 
instead of `resume()` and `resume.nt` instead of `resume.nothrow()`

Want to catch all uncaught exceptions? You can pass a callback argument to
`genny.run`:

```js
genny.run(function* (resume) {
    var data = yield fs.readFile("test.js", resume.t);
}, function(err) {
    // thrown error propagates here automagically 
    // because it was not caught.
});
```

You can also use `genny` instead to create a function which
can accept multiple arguments and a callback. The arguments will be 
passed to your generator right after the first `resume` argument

```js
var getLine = genny.fn(function* (resume, file, number) {
    var data = yield fs.readFile(file, resume.t);
    return data.toString().split('\n')[number];
});

getLine('test.js', 2, function(err, lineContent) {
    // thrown error propagates here automagically 
    // because it was not caught.
    // If the file actually exists, lineContent
    // will contain the second line
});
```

note: make sure that you pass the callback last. 

Notice how if you return a value at the end of your generator, it will
be passed as a result to the callback. If you return undefined, the
callback will not be called.


Your async functions call the callback with more than 2 arguments?
Not a problem - the yield call from within your task will return 
an array instead.

```js
function returnsmore(callback) {
    callback(null, 'arg1', 'arg2');
}

genny.run(function* (resume) {
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

# license 

MIT

