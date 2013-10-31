var t = require('tap');

var WorkQueue = require('../lib/work-queue');

t.test('work queue', function (t) {
    var q = new WorkQueue();

    t.equals(q.next, q);
    t.equals(q.prev, q);

    var a = q.add('a');
    t.equals(q.advance(), undefined);

    t.equals(q.next, a);
    t.equals(q.prev, a);

    q.next.complete = true;
    t.equals(q.advance(), a);
    t.equals(q.advance(), undefined);

    t.equals(q.next, q);
    t.equals(q.prev, q);
    t.end();
})

t.test('work queuing', function (t) {
    var q = new WorkQueue();

    t.equals(q.advance(), undefined);

    var a = q.add('a');
    t.equals(a.value, 'a');
    t.equals(q.advance(), undefined);

    var b = q.add('b');
    t.equals(q.advance(), undefined);

    var c = q.add('c');
    t.equals(q.advance(), undefined);

    b.complete = true;
    t.equals(q.advance(), undefined);

    a.complete = true;
    t.equals(q.advance(), a);
    t.equals(q.advance(), b);
    t.equals(q.advance(), undefined);

    c.complete = true;
    t.equals(q.advance(), c);
    t.equals(q.advance(), undefined);

    var d = q.add('d');
    t.equals(q.advance(), undefined);
    d.complete = true;
    t.equals(q.advance(), d);
    t.equals(q.advance(), undefined);

    t.end();
})
