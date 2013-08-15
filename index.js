
var slice = [].slice;

var hasSend = !!(function* () { yield 1; })().send;


var wq = require('./lib/work-queue'),
    WorkQueue = wq.WorkQueue,
    WorkItem = wq.WorkItem;

function stackFilter(stack) {
    return stack.split('\n').slice(1,4).filter(function(l) {
        return !~l.indexOf(__filename)
            && !~l.indexOf('GeneratorFunctionPrototype.next');
    }).join('\n');

}

function makeStackExtender(previous, noheader) {
    var asyncStack;
    try {
        throw new Error();
    } catch (e) {
        asyncStack =
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
        var args = slice.call(arguments), lastfn;

        if (args.length < 1) lastfn = null;
        else lastfn = args[args.length - 1];

        if (!(lastfn instanceof Function))
            lastfn = null;
        
        var iterator;
        var queue = new WorkQueue();


        function processPending() {
            //console.log("Process pending");
            var item, result;
            //console.log(queue);
            while (queue.check()) {
                //console.log("Next item: ", item);
                var val = queue.next.value;
                if (hasSend && item.value !== undefined) 
                    result = iterator.send(val);
                else 
                    result = iterator.next(val);

                queue.advance();
                //console.log("Generator yielded!");
                if (result.done && lastfn)
                    lastfn(null, result.value);
            }
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
            var extendedStack;
            if (exports.longStackSupport) 
                extendedStack = makeStackExtender(opt.previous);
            else 
                extendedStack = identity;

            var item = new WorkItem();
            queue.add(item);

            return function resume(err, res) {

                if (item.complete) 
                    return throwAt(iterator, extendedStack(
                        new Error("callback already called")));

                item.complete = true;
                if (err && opt.throwing) {
                    queue.empty();
                    return throwAt(iterator, extendedStack(err));
                }

                item.value = opt.throwing ? res : slice.call(arguments);

                try {
                    processPending();
                } catch (e) { 

                    if (/generator/i.test(e.message)) return;

                    queue.empty();
                    if (lastfn) return lastfn(e);
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
                var extendedStack;
                if (exports.longStackSupport) 
                    extendedStack = makeStackExtender(previous, true);
                return makeResume(extendedStack);
            };
            return resume;
        }
        if (lastfn) 
            args[args.length - 1] = makeResume();
        else
            args.push(makeResume());
        iterator = gen.apply(this, args);

        // first item sent to generator is undefined
        var item = new WorkItem()
        item.complete = true;
        queue.add(item); 

        try {
            processPending();
        } catch (e) {
            queue.empty();
            if (lastfn) return lastfn(e);
            else throw e;
        }
        
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
    exports.fn(gen)(cb);
}
