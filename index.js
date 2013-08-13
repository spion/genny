
var slice = [].slice;

var hasSend = !!(function* () { yield 1; })().send;


function stackFilter(stack) {
    return stack.split('\n').slice(1,4).filter(function(l) {
        return !~l.indexOf(__filename)
            && !~l.indexOf('GeneratorFunctionPrototype.next');
    }).join('\n');

}

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



        function extendedStackBind(asyncStack, previous) {
            return function(err) {
                if (err.stack) 
                    err.stack += '\nFrom previous event:\n'
                              + stackFilter(asyncStack);
                if (previous) 
                    err = previous(err);
 
                return err;
            }
        }
 
        function createResumer(opt) {
            if (exports.longStackSupport) try {
                throw new Error();
            } catch (e) {
                var extendedStack = extendedStackBind(
                    e.stack.substring(e.stack.indexOf("\n") + 1), 
                    opt.previous);
            }
           var called = false;
            return function resume(err, res) {
                if (called) try {
                    var e = new Error("callback already called");
                    return iterator.throw(
                        extendedStack ? extendedStack(e) : e);
                } catch (err) { 
                    if (errback) return errback(err); 
                    else throw err; 
                }
                called = true;
                if (err && opt.throwing) try {
                    return iterator.throw(
                        extendedStack ? extendedStack(err) : err);
                } catch (err) {
                    if (errback) return errback(err); 
                    else throw err; 
                } else {
                    if (opt.throwing) var sendargs = res;
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

        function makeResume(previous) {
            var resume = function() { 
                return createResumer({throwing: true, previous: previous});
            }
            resume.nothrow = function() {
               return createResumer({throwing: false, previous: previous});
            }
            resume.generator = function() {
                if (exports.longStackSupport) try {
                    throw new Error();
                } catch (e) {
                    var extendedStack = extendedStackBind(
                        e.stack.substring(e.stack.indexOf("\n") + 1), 
                        previous)
                }
                return makeResume(extendedStack);
            };
            Object.defineProperty(resume, 't',  { get: resume });
            Object.defineProperty(resume, 'nt', { get: resume.nothrow });
            Object.defineProperty(resume, 'g', { get: resume.generator });
            return resume;
        }
        args.unshift(makeResume());
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
