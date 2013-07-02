
var slice = [].slice;

function genny(gen) {
    return function start() {
        var args = slice.call(arguments);

        var callback;
        if (args.length < 1) callback = null;
        else callback = args[args.length - 1];
        if (!(callback instanceof Function))
            callback = null;
        else
            args = args.slice(0, args.length - 1);

        var iterator;
        var nextYields = [];

        function sendNextYield() {
            while (nextYields.length) {         
                var ny = nextYields.pop();
                iterator.next(ny);
            }
        }


        var resume = createResumer.bind(null, true);
        var resumerId = 0;

        function createResumer(throwing) {
            var called = false;
            // If its not a throwing resumer, dont slice the error argument
            var sliceArgs = throwing ? 1 : 0;
            var rid = ++resumerId;
            return function resume(err) {
                if (called) return;
                called = true;
                if (err && throwing) try {
                    return iterator.throw(err);
                } catch (err) {
                    if (callback) callback(err); 
                    else throw e; // todo: check if this is a good idea

                } else {
                    var sendargs = slice.call(arguments, sliceArgs);
                    if (sendargs.length <= 1 && throwing) 
                        sendargs = sendargs[0];
                    try {
                        var result = iterator.next(sendargs);
                        if (result.done && callback)
                            callback(null, result.value);

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

        args.push(resume);
        iterator = gen.apply(this, args);
        var result = iterator.next();
        if (result.done && callback)
            callback(null, result.value);

        sendNextYield();
    }
}

module.exports = genny;
module.exports.run = function(gen, cb) {
    genny(gen)(cb);
}
