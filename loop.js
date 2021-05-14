const assert = require('assert')

const { Future } = require('perhaps')
const { Queue } = require('avenue')
const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')
const Verbatim = require('verbatim')
const DOMException = require('domexception')

const { extractify } = require('./extractor')

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

    async run (transaction, schema, names) {
        await new Promise(resolve => setImmediate(resolve))
        for (const name of names) {
            console.log(name)
        }
        console.log('pause done', this.queue.length)
        while (this.queue.length != 0) {
            const event = this.queue.shift()
            SWITCH: switch (event.method) {
            // Don't worry about rollback of the update to the schema object. We
            // are not going to use this object if the upgrade fails.
            case 'store': {
                    const { name, keyPath, autoIncrement } = event
                    transaction.set('schema', { name: `store.${name}`, keyPath, autoIncrement: autoIncrement ? null : 0, indices: {} })
                    await transaction.store(`store.${name}`, { key: 'indexeddb' })
                }
                break
            case 'index': {
                    const { name, keyPath, unique, multiEntry } = event
                    const key = {}
                    const qualified = `value.${keyPath}`
                    key[qualified] = 'indexeddb'
                    await transaction.index([ `store.${name.store}`, name.index ], key)
                    const store = await transaction.get('schema', [ `store.${name.store}` ])
                    schema[name.store].indices[name.index] = { keyPath, unique, multiEntry, extractor: extractify(qualified)  }
                    transaction.set('schema', `store.${name.store}`, store)
                }
                break
            case 'add': {
                    let { name, key, value, request } = event
                    if (key == null) {
                        event.key = key = ++schema[name].autoIncrement
                    }
                    console.log('key', key, value)
                    const got = await transaction.get(`store.${name}`, [ key ])
                    if (got != null) {
                        console.log('I REALLY SHOULD EMIT AN ERROR')
                        const event = new Event('error', { bubbles: true, cancelable: true })
                        const error = new DOMException('Unique key constraint violation.', 'ConstraintError')
                        request.error = error
                        const caught = dispatchEvent(request, event)
                        console.log('???', caught)
                        break SWITCH
                    }
                }
                /* fall through */
            case 'put': {
                    // TODO Move extraction into store interface.
                    let { name, key, value, request } = event
                    if (key == null) {
                        key = ++schema[name].autoIncrement
                    }
                    const record = { key, value }
                    for (const indexName in schema[name].indices) {
                        const index = schema[name].indices[indexName]
                        if (index.unique) {
                            const got = await transaction.get([ `store.${name}`, indexName ], [ (index.extractor)(record) ])
                            if (got != null) {
                                console.log('I REALLY SHOULD EMIT AN ERROR')
                                const event = new Event('error', { bubbles: true, cancelable: true })
                                const error = new DOMException('Unique key constraint violation.', 'ConstraintError')
                                request.error = error
                                const caught = dispatchEvent(request, event)
                                console.log('???', caught)
                                break SWITCH
                            }
                        }
                    }
                    transaction.set(`store.${name}`, record)
                    dispatchEvent(request, new Event('success'))
                }
                break
            case 'get': {
                    const { name, key, request } = event
                    const got = await transaction.get(`store.${name}`, [ key ])
                    request.result = Verbatim.deserialize(Verbatim.serialize(got.value))
                    dispatchEvent(request, new Event('success'))
                }
                break
            case 'openCursor': {
                    const { name, request, cursor } = event
                    console.log('openCursor', !! request)
                    console.log(`store.${name}`)
                    cursor._outer = { iterator: transaction.cursor(`store.${name}`).iterator()[Symbol.asyncIterator](), next: null }
                    cursor._outer.next = await cursor._outer.iterator.next()
                    if (cursor._outer.next.done) {
                        throw new Error
                    } else {
                        cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                        this.queue.push({ method: 'item', request, name, cursor })
                    }
                }
                break
            case 'item': {
                    const { request, cursor } = event
                    for (;;) {
                        const next = cursor._inner.next()
                        if (next.done) {
                            cursor._outer.next = await cursor._outer.iterator.next()
                            if (cursor._outer.next.done) {
                                request.result = null
                                dispatchEvent(request, new Event('success'))
                                break
                            } else {
                                cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                            }
                        } else {
                            cursor._value = next.value
                            dispatchEvent(request, new Event('success'))
                            break
                        }
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
