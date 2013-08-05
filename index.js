
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
        var nextYields = [];

        function sendNextYield() {
            while (nextYields.length) {         
                var ny = nextYields.pop();
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

        function createResumer(throwing) {
            var called = false;
            // If its not a throwing resumer, dont slice the error argument
            return function resume(err, res) {
                if (called) try {
                    return iterator.throw(new Error("callback already called")); 
                } catch (err) { }
                called = true;
                if (err && throwing) try {
                    return iterator.throw(err);
                } catch (err) {
                    if (errback) return errback(err); 
                    // todo: check if this is a good idea
                    else throw err; 
                } else {
                    if (throwing) var sendargs = res;
                    else var sendargs = slice.call(arguments);
                    try {
                        advance(iterator, sendargs);
                        sendNextYield();
                    } catch (e) { // generator already running, delay send
                        if (e.message.match(/generator/i))
                            nextYields.push(sendargs);
                        else
                            if (errback) return errback(e); 
                            // todo: check if this is a good idea
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
        sendNextYield();
    }
}

exports.fn = genny.bind(null, {callback:true, errback: true});

exports.listener = genny.bind(null, {callback: false, errback: false});

exports.middleware = genny.bind(null, {callback: false, errback: true});

exports.run = function(gen, cb) {
    exports.fn(gen)(cb);
}
