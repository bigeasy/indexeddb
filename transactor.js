const { Queue } = require('avenue')

class Transactor {
    constructor () {
        this.queue = new Queue
        this._queues = []
    }

    _startTransactions () {
        WAITS: for (const name in this._queues) {
            const queue = this._queues[name]
            for (;;) {
                const node = queue.waiting[0]
                if (node == null) {
                    continue WAITS
                }
                let iterator = node.wait.head
                const wait = iterator.wait
                while (iterator != null) {
                    const queue = this._queues[iterator.name]
                    if (
                        queue.waiting[0] !== iterator ||
                        (
                            queue.running != null &&
                            ! (queue.running.readOnly && wait.readOnly)
                        )
                    ) {
                        continue WAITS
                    }
                    iterator = iterator.next
                }
                iterator = node.wait.head
                while (iterator != null) {
                    const queue = this._queues[iterator.name]
                    queue.waiting.shift()
                    if (queue.running == null) {
                        queue.running = wait
                    } else {
                        queue.running.count++
                    }
                    iterator = iterator.next
                }
                const { names, readOnly, extra } = wait
                this.queue.push({ names, readOnly, extra })
            }
        }
    }

    transaction (extra, names, readOnly) {
        const wait = { head: null, readOnly, count: 1, names, extra }
        for (const name of names) {
            const node = { wait, name, next: wait.head }
            wait.head = node
            this._queues[name] || (this._queues[name] = { waiting: [], running: null })
            this._queues[name].waiting.push(node)
        }
        this._startTransactions()
    }

    complete (names) {
        for (const name of names) {
            const queue = this._queues[name]
            if (--queue.running.count == 0) {
                queue.running = null
            }
        }
        this._startTransactions()
    }
}

module.exports = Transactor
