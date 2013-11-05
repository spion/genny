/* jshint esnext:true */

var slice = [].slice;

var WorkQueue = require('./lib/work-queue');

function stackFilter(stack) {
    return stack.split('\n').slice(1,4).filter(function(l) {
        return !~l.indexOf(__filename)
            && !~l.indexOf('GeneratorFunctionPrototype.next');
    }).join('\n');

}

function makeStackExtender(previous, noheader) {
    var e = new Error();
    return function(err) {
        var asyncStack = e.stack.substring(e.stack.indexOf("\n") + 1);
        if (err.stack) {
            if (!noheader) err.stack += '\nFrom generator:'
            err.stack += '\n' + stackFilter(asyncStack);
        }
        if (previous)
            err = previous(err);
       return err;
    }
}


function genny(gen) {
    return function start() {
        var args = slice.call(arguments), lastfn;

        if (args.length < 1) lastfn = null;
        else lastfn = args[args.length - 1];

        if (!(lastfn instanceof Function))
            lastfn = null;

        var iterator;
        var queue = new WorkQueue();

        function handleParallel(array) {
            var pending = array.length,
                results = new Array(pending);

            var resumer = resume();

            var errored = false;
            function handler(k) {
                var called = false;
                return function(err, res) {
                    if (errored) return;
                    if (called) {
                        errored = true;
                        return resumer(new Error("thunk already called"));
                    }
                    if (err) {
                        errored = true;
                        return resumer(err);
                    }
                    called = true;
                    results[k] = res;
                    if (!--pending)
                        resumer(null, results);
                }
            }
            array.forEach(function(item, k) {
                if (item.then instanceof Function)
                    handlePromise(item, handler(k));
                else if (item instanceof Function)
                    item(handler(k));
            });
        }

        function handlePromise(promise, handler) {
            var handler = handler || resume();
            promise.then(function promiseSuccess(result) {
                handler(null, result)
            }, function promiseError(err) {
                handler(err);
            });
        }

        function identity(err) { return err; }

        var processing = false;

        function createResumer(opt) {
            var extendedStack = exports.longStackSupport ? makeStackExtender(opt.previous) : identity;

            var item = queue.add(undefined);

            return function _resume(err, res) {
                if (item.complete === null) return; // item was emptied when throwing, so we can ignore it
                if (item.complete === true) throw extendedStack(new Error("callback already called"));

                item.complete = true;
                item.value = slice.call(arguments)

                if (processing) // protects iterator.next() from a subsequent resume()() also trying to run iterator.next() before this one has returned (i.e reached a yield/return)
                    return;
                processing = true;
                try {
                    var qitem;
                    while (qitem = queue.remove()) {
                        var result, args = qitem.value;
                        if (opt.throwing) {
                            if (args[0]) result = iterator.throw(extendedStack(args[0]));
                            else         result = iterator.next(args[1])
                        } else           result = iterator.next(args);
                        if (result.done && lastfn)
                            lastfn(null, result.value);
                        else if (result.value && result.value != resume)
                            // handle promises
                            if (result.value.then instanceof Function)
                                handlePromise(result.value);
                            // handle thunks
                            else if (result.value instanceof Function)
                                result.value(resume());
                            else if (result.value instanceof Array)
                            handleParallel(result.value);
                    }
                } catch (e) {
                    queue.empty();
                    if (lastfn) return lastfn(e);
                    else throw e;
                } finally {
                    processing = false;
                }
                //extendedStack = null;
            }
        }

        function makeResume(previous) {
            var resume = function() {
                return createResumer({throwing: true, previous: previous});
            }
            resume.nothrow = function() {
               return createResumer({throwing: false, previous: previous});
            }
            resume.gen = function() {
                var extendedStack;
                if (exports.longStackSupport)
                    extendedStack = makeStackExtender(previous, true);
                return makeResume(extendedStack);
            };
            return resume;
        }
        var resume = makeResume();
        if (lastfn)
            args[args.length - 1] = resume;
        else
            args.push(resume);
        iterator = gen.apply(this, args);

        // send something undefined to start the generator
        createResumer({throwing: true, previous: undefined})(null, undefined);
    }
}

var exports = module.exports = genny;

exports.longStackSupport = global.longStackSupport;

exports.fn = genny;

exports.listener = function(gen) {
    var fn = genny(gen);
    return function() {
        var args = [].slice.call(arguments);
        args.push(function ignoreListener(err, res) {});
        fn.apply(this, args);
    }
}

exports.middleware = function(gen) {
    var fn = genny(gen);
    return function(req, res, next) {
        fn(req, res, function(err, res) {
            if (next)
                if (err)
                    next(err);
                else if (res === true)
                    next();
        });
    }
}

exports.run = function(gen, cb) {
    if(cb)
        exports.fn(gen)(cb);
    else
        exports.fn(gen)();
}
