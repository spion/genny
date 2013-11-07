# genny

An ES6 (harmony) library for node 0.11.2 and up that helps you use generators
with node style callbacks, similar to
[suspend](https://github.com/jmar777/suspend)

Benefits:

- No need to wrap anything or use fn.bind. Works with regular callback-taking
  node functions.
- Complete error stack traces
- Compatible: also works with promises, thunks and arrays of promises/thunks.


# usage examples

Spawn a generator task. From within your task, call your async functions with
yield. Instead of a callback function, pass them a generated resume function:

```js
genny.run(function* (resume) {
    console.log("Hello");
    yield setTimeout(resume(), 1000);
    console.log("World");
});
```

Genny automatically passes `resume` as the last argument to your generator.
Its a constructor that can make resume callbacks.

The generator pauses when it encounters a yield, then resumes when the created
resume callback is called by the async operation. If the callback was called
with a value:

```js
fn(null, value)
```

then the yield expression will return that value.

Example:

```js
genny.run(function* (resume) {
    var data = yield fs.readFile("test.js", resume());
    console.log(data.toString())
});
```

## errors

You can handle errors with `try`/`catch`, or as return results via
`resume.nothrow`

```js
genny.run(function* (resume) {
    // Throwing resume
    try {
        yield fs.readFile("test.js", resume());
    }
    catch (e) { // handle error
        console.error("Error reading file", e);
    }
    // Non-throwing resume, result is an array.
    var err_res = yield fs.readFile("test.js", resume.nothrow());
    if (err_res[0]) { // handle error
        console.error("Error reading file", err_res[0]);
    }
});
```

Alternatively, you can pass a callback argument to `genny.run`:

```js
genny.run(function* (resume) {
    var data = yield fs.readFile("test.js", resume());
}, function(err) {
    // thrown error propagates here automatically
    // because it was not caught.
    if (err)
        console.error("Error reading file", err);
});
```

## creating callback functions

You can also use `genny.fn` instead to create a function which
can accept multiple arguments and a callback. The arguments will be
passed to your generator, but instead of the callback, you will get
genny's `resume`

```js
var getLine = genny.fn(function* (file, number, resume) {
    var data = yield fs.readFile(file, resume());
    return data.toString().split('\n')[number];
});

getLine('test.js', 2, function(err, line) {
    // thrown error propagates here automagically
    // because it was not caught.
    // If the file actually exists, lineContent
    // will contain the second line
    if (err)
        console.error("Error reading line", err);
});
```

The result is a function that takes the specified arguments plus
a standard node style callback. If you return a value at the end of your
generator, it is passed as the result argument to the callback.

## multi-argument callbacks, calling generators

If an async functions calls the callback with more than 2 arguments, an
array will be returned from the yield:

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

Use `yield*` and `resume.gen()` to call a genny-compatible generator:

```
yield* someGenerator(args..., resume.gen())
```

# listeners and middleware

`genny.fn` creates a callback-taking node function which requires its last
argument to be a callback. To create a listener function use `genny.listener`
instead:

```js
ee.on('event', genny.listener(function* (resume) { ... }));
```

Listeners currently ignore all errors and return values, but this may change
in the future.

To create an express or connect middleware that properly forwards errors,
use `genny.middleware`

```js
app.get('/test', genny.middleware(function* (req, res, resume) {
    if (yield isAuth(req, resume.t))
        return true; // will call next()
    else
        throw new CodedError(401, "Unauthorized"); // will call next(err)

    // or use return; and next() will not be called.
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
From generator:
    at innerGenerator1 (/home/spion/Documents/genny/test/index.js:136:26)
    at innerGenerator2 (/home/spion/Documents/genny/test/index.js:139:43)
    at innerGenerator3 (/home/spion/Documents/genny/test/index.js:142:43)
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

This results with CPU overhead of approximately 100% and memory overhead of
approximately 80%.

In the future, the overhead will probably be eliminated in node but not in
browsers.

# more info

Look in `test/index.js` for more examples and tests.

# thanks

[jmar777](https://github.com/jmar777) for his awesome
[suspend](https://github.com/jmar777/suspend) library which served
as the base for genny

# license

MIT

