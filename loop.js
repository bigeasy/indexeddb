const { Future } = require('perhaps')
const { Queue } = require('avenue')
const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')
const Verbatim = require('verbatim')

// You're using this because you need to know when the queue of work done.
// You're not able to explicitly push a `null` onto an `Avenue` queue. We have
// this object that contains a queue we push onto and shift from, when the queue
// inside the empty we can terminate an Avenue queue used as a worker queue.
// Guess I'm not using Turnstile for now, but it will nag me until I migrate.
class Loop {
    constructor () {
        this.queue = []
        this.terminated = false
    }

    async run (transaction) {
        await new Promise(resolve => setImmediate(resolve))
        console.log('pause done', this.queue.length)
        while (this.queue.length != 0) {
            const event = this.queue.shift()
            switch (event.method) {
            case 'store': {
                    const key = {}
                    key[event.keyPath] = 'indexeddb'
                    await transaction.store(event.name, key)
                }
                break
            case 'put':
            case 'add': {
                    transaction.set(event.name, event.value)
                }
                break
            case 'get': {
                    const { name, key, request } = event
                    console.log(name, key, request)
                    const got = await transaction.get(name, [ key ])
                    request.result = Verbatim.deserialize(Verbatim.serialize(got))
                    dispatchEvent(request, new Event('success'))
                }
                break
            }
            await new Promise(resolve => setImmediate(resolve))
        }
        this.queue.terminated = true
    }
}

module.exports = Loop
