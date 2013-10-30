function WorkItem(val, queue) {
    this.next = this.prev = queue;
    this.complete = false;
    this.value = val;
}

function WorkQueue() {
    this.next = this.prev = this;
    this.complete = false;
}


WorkQueue.prototype.add = function(item) {
    this.prev.next = item;
    this.prev = item;
    item.next = this;
    item.prev = this;
}

WorkQueue.prototype.check = function() {
    return this.next.complete;
}

WorkQueue.prototype.advance = function() {
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


exports.WorkQueue = WorkQueue;
exports.WorkItem = WorkItem;
