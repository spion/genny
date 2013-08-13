
var slice = [].slice;

var hasSend = !!(function* () { yield 1; })().send;


function stackFilter(stack) {
    return stack.split('\n').slice(1,4).filter(function(l) {
        return !~l.indexOf(__filename)
            && !~l.indexOf('GeneratorFunctionPrototype.next');
    }).join('\n');

}

function makeStackExtender(previous, noheader) {
    try {
        throw new Error();
    } catch (e) {
        var asyncStack =
            e.stack.substring(e.stack.indexOf("\n") + 1);
    } 
    return function(err) {
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
        var args = slice.call(arguments);

        if (args.length < 1) 
            var lastfn = null;
        else 
            var lastfn = args[args.length - 1];
        if (!(lastfn instanceof Function))
            lastfn = null;
        

        var iterator;
        var pending = [];

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
            if (result.done && lastfn)
                lastfn(null, result.value);
        }


        function throwAt(iterator, err) {
            try {
                iterator.throw(err);
            } catch(e) {
                if (lastfn) return lastfn(err); 
                else throw err; 
            }
        }

        function identity(err) { return err; }
 
        function createResumer(opt) {
            if (exports.longStackSupport) 
                extendedStack = makeStackExtender(opt.previous);
            else 
                extendedStack = identity;

            var called = false;
            return function resume(err, res) {
                if (called) 
                    return throwAt(iterator, extendedStack(
                        new Error("callback already called")));
                called = true;
                if (err && opt.throwing) 
                    return throwAt(iterator, extendedStack(err));
                    
                var sendargs = opt.throwing ? res : slice.call(arguments);
                try {
                    advance(iterator, sendargs);
                    processPending();
                } catch (e) { 
                    // generator already running, delay send
                    if (/generator/i.test(e.message))
                        pending.push(sendargs);
                    else if (lastfn) 
                        return lastfn(e);
                    else throw e; 

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
            resume.gen = function() {
                if (exports.longStackSupport) 
                    var extendedStack = makeStackExtender(previous, true);
                return makeResume(extendedStack);
            };
            return resume;
        }
        args.unshift(makeResume());
        iterator = gen.apply(this, args);
        try {
            advance(iterator);
        } catch (e) {
            if (lastfn) 
                return lastfn(e);
            else throw e;
        }
        processPending();
    }
}

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
        fn(req, res, next, function(err, res) {
            if (next) 
                if (err) 
                    next(err);
                else if (res == true) 
                    next();
        });
    }
}

exports.run = function(gen, cb) {
    exports.fn(gen)(cb);
}
