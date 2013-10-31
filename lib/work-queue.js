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
    item.next = this;
    item.prev = this;
    return item;
}

WorkQueue.prototype.check = function() {
    return this.next.complete;
}

WorkQueue.prototype.remove = function() {
    if (this.next.complete) {
        var current = this.next;
        this.next = this.next.next;
        this.next.prev = this;
        return current;
    }
}

WorkQueue.prototype.empty = function() {
    this.next = this.prev = this;
}

module.exports = WorkQueue;
