
function WorkItem(val) {
    this.complete = false;
    this.value = val;
    this.next = null;
}


function WorkQueue() {
    this.next = this.last = null;
    return;
}

WorkQueue.prototype.add = function(item) {
    if (this.last == null) {
        this.next = this.last = item;
    }
    else {
        this.last.next = item;
        this.last = item;
    }
}
WorkQueue.prototype.check = function() {
    return this.next && this.next.complete;
}

WorkQueue.prototype.advance = function() {
    if (this.next && this.next.complete) {
        var current = this.next;
        this.next = this.next.next;
        if (this.next === null) 
            this.last = null;
    }
}
WorkQueue.prototype.empty = function() {
    this.next = this.last = null;
}


exports.WorkQueue = WorkQueue;
exports.WorkItem = WorkItem;

