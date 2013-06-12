function genny(gen) {
  return function start() {
    var args = [].slice.call(arguments);

    if (args.length <= 1) 
      callback = null;
    else 
      var callback = args[args.length - 1];
      if (!(callback instanceof Function))
        callback = null;

    var iterator;
    var nextYields = [];

    function sendNextYield() {
      while (nextYields.length) { 
        console.log(nextYields);
        var ny = nextYields.pop();
        console.log("sending queued yield", ny);
        iterator.send(ny);
      }
    }


    var resume = createResumer.bind(null, true);


    function createResumer(throwing) {
      var called = false;
      var sliceArgs = throwing ? 1 : 0;
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
          var sendargs = Array.prototype.slice.call(arguments, sliceArgs);
          if (sendargs.length <= 1) 
            sendargs = sendargs[0];
          try {
            iterator.send(sendargs);
            sendNextYield();
          } catch (e) { // already running
            nextYields.push(sendargs); // delay send
          }
        }

      }
    }

    Object.defineProperty(resume, 'throw', {
      get: createResumer.bind(null, false) 
    });

    Object.defineProperty(resume, 'nothrow', {
      get: createResumer.bind(null, true) 
    });


    args.unshift(resume);

    iterator = gen.apply(this, args);
    iterator.next();
    sendNextYield();
  }
}

module.exports = genny;
