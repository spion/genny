
var slice = [].slice;


var hasSend = !!(function* () {})().send;

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

        var resume = createResumer.bind(null, true);
        var resumerId = 0;

        function createResumer(throwing) {
            var called = false;
            // If its not a throwing resumer, dont slice the error argument
            var sliceArgs = throwing ? 1 : 0;
            var rid = ++resumerId;
            return function resume(err, res) {
                if (called) return;
                called = true;
                if (err && throwing) try {
                    return iterator.throw(err);
                } catch (err) {
                    if (errback) errback(err); 
                    else throw e; // todo: check if this is a good idea

                } else {
                    if (throwing) var sendargs = res;
                    else var sendargs = slice.call(arguments);
                    try {
                        advance(iterator, sendargs);
                        sendNextYield();
                    } catch (e) { // generator already running, delay send
                        nextYields.push(sendargs);
                    }
                }

            }
        }

        Object.defineProperty(resume, 't', {
            get: createResumer.bind(null, true) 
        });
        Object.defineProperty(resume, 'nt', {
            get: createResumer.bind(null, false) 
        });

        resume.nothrow = createResumer.bind(null, false);

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
