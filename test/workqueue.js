var t = require('tap');

var wq = require('../lib/work-queue'),
    WorkQueue = wq.WorkQueue,
    WorkItem = wq.WorkItem;


t.test('work queue', function (t) {
    var q = new WorkQueue();
    q.add(new WorkItem('a'));
    t.equals(q.advance(), undefined);
    q.next.complete = true;
    t.equals(q.next.value, 'a');
    q.advance()
    t.equals(q.next, null);
    t.end();
})
