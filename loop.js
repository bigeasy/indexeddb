const Future = require('perhaps')

class Loop {
    constructor () {
        this._queue = []
        this._future = new Future
    }

    push (event) {
        this._queue.push(event)
        this._future.resolve()
    }

    async consume (consumer) {
        await this._future.promise
        while (this._queue.length != 0) {
            await consumer.dispatch(this._queue.shift())
        }
    }
}

module.exports = Loop
