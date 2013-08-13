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
Want to catch all uncaught exceptions? You can pass a callback argument to
`genny.run`:

```js
genny.run(function* (resume) {
    var data = yield fs.readFile("test.js", resume());
}, function(err) {
    // thrown error propagates here automagically 
    // because it was not caught.
});
```

## creating callback functions

You can also use `genny.fn` instead to create a function which
can accept multiple arguments and a callback. The arguments will be 
passed to your generator right after the first `resume` argument

```js
var getLine = genny.fn(function* (resume, file, number) {
    var data = yield fs.readFile(file, resume());
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
be passed as a result to the callback. 


Your async functions call the callback with more than 2 arguments?
Not a problem - the yield call from within your task will return 
an array instead.

```js
function returnsmore(callback) {
    callback(null, 'arg1', 'arg2');
}

genny.run(function* (resume) {
    var res = yield returnsmore(resume());
    var arg1 = res[0];
    var arg2 = res[1];
    var nothrowres = yield returnsmore(resume.nothrow());
    var err = res[0];
    var arg1 = res[1];
    var arg2 = res[2];
});
```

Want to call a genny-compatible generator instead? Use:

```
yield* someGenerator(resume.gen(), args...)
```

# listeners and middleware

genny.fn creates a callback-taking node function which requires its last 
argument to be a callback. To create a listener function use `genny.listener` 
instead:

```
ee.on('event', genny.listener(function* (resume) { ... }));
```

Note that listeners currently ignore all errors and return values, but this 
may change in the future.

To create an express or connect middleware that properly forwards errors,
use `genny.middleware`

```js
app.get('/test', genny.middleware(function* (resume, req, res) {
    if (yield isAuth(req, resume.t)) 
        return true; // will call next() 
    else
        throw new CodedError(401, "Unauthorized); // will call next(err)

    // or use "return;" and next() will not be called.
});
```

# debugging

genny comes with longStackSupport that enables you to trace 
errors across generators. Simply write:

```js
require('genny').longStackSupport = true
```

to get stack traces like these:

```
Error: oops
    at Object._onImmediate (/home/spion/Documents/genny/test/index.js:10:12)
    at processImmediate [as _immediateCallback] (timers.js:325:15)
From previous event:
    at innerGenerator1 (/home/spion/Documents/genny/test/index.js:136:26)
From previous event:
    at innerGenerator2 (/home/spion/Documents/genny/test/index.js:139:43)
    at innerGenerator3 (/home/spion/Documents/genny/test/index.js:142:20)
From previous event:
    at innerGenerator3 (/home/spion/Documents/genny/test/index.js:142:43)
    at Test.completeStackTrace2 (/home/spion/Documents/genny/test/index.js:145:20)
From previous event:
    at Test.completeStackTrace2 (/home/spion/Documents/genny/test/index.js:145:43)
```

for code like this:

```js
function* innerGenerator1(resume) {
    yield errors(resume());
}
function* innerGenerator2(resume) {
    yield* innerGenerator1(resume.gen());
} 
function* innerGenerator3(resume) {
    yield* innerGenerator2(resume.gen());
}
yield* innerGenerator3(resume.gen());
```

This results with CPU overhead of approximately 500% and memory overhead 
of approximately 40%

# more

Look in `test/index.js` for more examples and tests.

# thanks

[jmar777](https://github.com/jmar777) for his awesome 
[suspend](https://github.com/jmar777/suspend) library which served 
as the base for genny

# license 

MIT

