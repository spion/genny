function genny(gen) {
    return function start() {
        var slice = [].slice;
        var args = slice.call(arguments);

        if (args.length < 1) 
            callback = null;
        else 
            var callback = args[args.length - 1];
        if (!(callback instanceof Function))
            callback = null;

        var iterator;
        var nextYields = [];

        function sendNextYield() {
            while (nextYields.length) {         
                var ny = nextYields.pop();
                iterator.send(ny);
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
                } catch (e) {
                    // if we have a callback passed, send it the error
                    if (callback) callback(e);
                    // otherwise throw.
                    else throw e;

                } else {
                    var sendargs = slice.call(arguments, sliceArgs);
                    if (sendargs.length <= 1) {
                        sendargs = sendargs[0];
                    }
                    try {
                        iterator.send(sendargs);
                        sendNextYield();
                    } catch (e) { // already running, delay send
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
        iterator.next();
        sendNextYield();
    }
}

module.exports = genny;
