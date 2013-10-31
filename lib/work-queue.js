function WorkItem(val, queue) {
    this.next = this.prev = queue;
    this.complete = false;
    this.value = val;
}

function WorkQueue() {
    this.next = this.prev = this;
    this.complete = false;
}

WorkQueue.prototype.add = function(val) {
    var item = new WorkItem(val, this);
    this.prev.next = item;
    this.prev = item;
    return item;
}

WorkQueue.prototype.remove = function() {
    if (this.next.complete !== false) {
        var item = this.next;
        this.next = this.next.next;
        this.next.prev = this;
        return item;
    }
}

WorkQueue.prototype.empty = function() {
    while (this.next != this) {
        this.next.complete = null;
        var item = this.remove();
    }
}

module.exports = WorkQueue;
