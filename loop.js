const { Future } = require('perhaps')
const { Queue } = require('avenue')
const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')
const { extractify } = require('./extractor')
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

    async run (transaction, schema) {
        await new Promise(resolve => setImmediate(resolve))
        console.log('pause done', this.queue.length)
        while (this.queue.length != 0) {
            const event = this.queue.shift()
            switch (event.method) {
            // Don't worry about rollback of the update to the schema object. We
            // are not going to use this object if the upgrade fails.
            case 'store': {
                    const { name, keyPath, autoIncrement } = event
                    schema[name] = {
                        keyPath, autoIncrement, extractor: extractify(keyPath)
                    }
                    transaction.set('schema', { name: `store.${name}`, keyPath, autoIncrement })
                    await transaction.store(`store.${name}`, { key: 'indexeddb' })
                }
                break
            case 'put':
            case 'add': {
                    const { name, value } = event, { extractor } = schema[name]
                    const key = extractor(value)
                    transaction.set(`store.${name}`, { key, value })
                }
                break
            case 'get': {
                    try {
    // TODO Move extraction into store interface.
                    const { name, key, request } = event
                    const got = await transaction.get(`store.${name}`, [ key ])
                    console.log(got)
                    request.result = Verbatim.deserialize(Verbatim.serialize(got.value))
                    dispatchEvent(request, new Event('success'))
                    } catch (error) {
                        console.log(error.stack)
                    }
                }
                break
            }
            await new Promise(resolve => setImmediate(resolve))
        }
        this.queue.terminated = true
    }
}

module.exports = Loop
