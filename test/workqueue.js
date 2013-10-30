var t = require('tap');

var wq = require('../lib/work-queue'),
    WorkQueue = wq.WorkQueue,
    WorkItem = wq.WorkItem;


t.test('work queue', function (t) {
    var q = new WorkQueue(), a = new WorkItem('a');

    t.equals(q.next, q);
    t.equals(q.prev, q);

    q.add(a);
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
    var q = new WorkQueue(), a = new WorkItem('a'), b = new WorkItem('b'), c = new WorkItem('c'), d = new WorkItem('d');

    t.equals(q.advance(), undefined);

    q.add(a);
    t.equals(q.next.value, 'a');
    t.equals(q.advance(), undefined);

    q.add(b);
    t.equals(q.advance(), undefined);

    q.add(c);
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

    q.add(d);
    t.equals(q.advance(), undefined);
    d.complete = true;
    t.equals(q.advance(), d);
    t.equals(q.advance(), undefined);

    t.end();
})
