
var slice = [].slice;

var hasSend = !!(function* () { yield 1; })().send;

function genny(opt, gen) {
    return function start() {
        var args = slice.call(arguments);

        var lastfn, callback, errback;
        if (args.length < 1 || !opt.callback) 
            lastfn = null;
        else 
            lastfn = args[args.length - 1];
        if (!(lastfn instanceof Function))
            lastfn = null;
        if (opt.callback) 
            callback = lastfn;
        if (opt.errback)
            errback = lastfn;


        var iterator;
        var pending = [];

        var lastStack = null;

        function processPending() {
            while (pending.length) {         
                var ny = pending.pop();
                advance(iterator, ny);
            }
        }

        function advance(iterator, args) {
            var result;
            if (hasSend && args !== undefined) 
                result = iterator.send(args);
            else 
                result = iterator.next(args);
            if (result.done && callback)
                callback(null, result.value);
        }

        function extendedStack(err, asyncStack) {
            if (asyncStack && err.stack) {
                var line = asyncStack.split('\n').slice(2,4).join('\n');
                var stackLines = err.stack.split('\n');
                err.stack += '\nFrom previous event:\n'
                          + line;
            }             
            return err;
        }

        function createResumer(throwing) {
            var called = false;
            if (exports.longStackSupport) try {
                throw new Error();
            } catch (e) {
                var asyncStack = e.stack.substring(e.stack.indexOf("\n") + 1);
            }
            return function resume(err, res) {
                if (called) try {
                    return iterator.throw(
                        extendedStack(new Error("callback already called"),
                                     asyncStack));
                } catch (err) { 
                    if (errback) return errback(err); 
                    else throw err; 
                }
                called = true;
                if (err && throwing) try {
                   return iterator.throw(
                       extendedStack(err, asyncStack));
                } catch (err) {
                    if (errback) return errback(err); 
                    else throw err; 
                } else {
                    if (throwing) var sendargs = res;
                    else var sendargs = slice.call(arguments);
                    try {
                        advance(iterator, sendargs);
                        processPending();
                    } catch (e) { 
                        // generator already running, delay send
                        if (/generator/i.test(e.message))
                            pending.push(sendargs);
                        else
                            if (errback) return errback(e);
                            else throw e; 
 
                    }
                }

            }
        }

        var resume = function() { 
            return createResumer(true);
        }

        Object.defineProperty(resume, 't', {
            get: function() { return createResumer(true); }
        });
        Object.defineProperty(resume, 'nt', {
            get: function() { return createResumer(false); }
        });

        resume.nothrow = function() {
           return createResumer(false);
        }

        args.unshift(resume);
        iterator = gen.apply(this, args);
        advance(iterator);
        processPending();
    }
}

exports.longStackSupport = global.longStackSupport;

exports.fn = genny.bind(null, {callback:true, errback: true});

exports.listener = genny.bind(null, {callback: false, errback: false});

exports.middleware = genny.bind(null, {callback: false, errback: true});

exports.run = function(gen, cb) {
    exports.fn(gen)(cb);
}
