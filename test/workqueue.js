var t = require('tap');

var WorkQueue = require('../lib/work-queue');

t.test('work queue', function (t) {
    var q = new WorkQueue();

    t.equals(q.next, q);
    t.equals(q.prev, q);

    var a = q.add('a');
    t.equals(q.remove(), undefined);

    t.equals(q.next, a);
    t.equals(q.prev, a);

    q.next.complete = true;
    t.equals(q.remove(), a);
    t.equals(q.remove(), undefined);

    t.equals(q.next, q);
    t.equals(q.prev, q);
    t.end();
})

t.test('work queuing', function (t) {
    var q = new WorkQueue();

    t.equals(q.remove(), undefined);

    var a = q.add('a');
    t.equals(a.value, 'a');
    t.equals(q.remove(), undefined);

    var b = q.add('b');
    t.equals(q.remove(), undefined);

    var c = q.add('c');
    t.equals(q.remove(), undefined);

    b.complete = true;
    t.equals(q.remove(), undefined);

    a.complete = true;
    t.equals(q.remove(), a);
    t.equals(q.remove(), b);
    t.equals(q.remove(), undefined);

    c.complete = true;
    t.equals(q.remove(), c);
    t.equals(q.remove(), undefined);

    var d = q.add('d');
    t.equals(q.remove(), undefined);
    d.complete = true;
    t.equals(q.remove(), d);
    t.equals(q.remove(), undefined);

    t.end();
})
