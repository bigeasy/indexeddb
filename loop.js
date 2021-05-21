const assert = require('assert')

const compare = require('./compare')

const { Future } = require('perhaps')
const { Queue } = require('avenue')
const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')
const Verbatim = require('verbatim')
const DOMException = require('domexception')

const { extractify } = require('./extractor')
const { vivify } = require('./setter')

// You're using this because you need to know when the queue of work done.
// You're not able to explicitly push a `null` onto an `Avenue` queue. We have
// this object that contains a queue we push onto and shift from, when the queue
// inside the empty we can terminate an Avenue queue used as a worker queue.
// Guess I'm not using Turnstile for now, but it will nag me until I migrate.

//
class Loop {
    constructor () {
        this.queue = []
        this.terminated = false
    }

    // Most of the logic of this implementation is in this one function.
    // The interface implementations do a lot of argument validation, but
    // most of the real work is here.

    //
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
                    const id = schema.name[name]
                    const properties = schema.store[id]
                    transaction.set('store', properties)
                    await transaction.store(properties.qualified, { key: 'indexeddb' })
                }
                break
            case 'index': {
                    const { name, keyPath, unique, multiEntry } = event
                    const id = schema.max.store++
                    const properties = schema.store[schema.name[name.store]]
                    properties.indices[name.index] = id
                    schema.index[id] = { type: 'index', id, name, qualified: `index.${id}`, keyPath, multiEntry, unique }
                    await transaction.store(schema.index[id].qualified, { key: 'indexeddb' })
                    schema.extractor[schema.index[id].qualified] = extractify(keyPath)
                    transaction.set('store', properties)
                    transaction.set('store', schema.index[id])
                }
                break
            case 'add': {
                    let { name, key, value, request } = event
                    const id = schema.name[name]
                    const properties = schema.store[id]
                    event.value = value = Verbatim.deserialize(Verbatim.serialize(value))
                    if (key == null) {
                        event.key = key = ++properties.autoIncrement
                        if (properties.keyPath != null) {
                            vivify(value, properties.keyPath, key)
                        }
                    }
                    const got = await transaction.get(properties.qualified, [ key ])
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
                    const id = schema.name[name]
                    const properties = schema.store[id]
                    value = Verbatim.deserialize(Verbatim.serialize(value))
                    if (key == null) {
                        key = ++schema.store[name].properties.autoIncrement
                    }
                    const record = { key, value }
                    for (const indexName in properties.indices) {
                        const indexId = properties.indices[indexName]
                        const index = schema.index[indexId]
                        const extracted = schema.extractor[index.qualified](record.value)
                        if (index.unique) {
                            const got = await transaction.cursor(index.qualified, [[ extracted ]])
                                                         .terminate(item => compare(item.key[0], extracted) != 0)
                                                         .array()
                            console.log('GOT', got)
                            if (got.length != 0) {
                                const event = new Event('error', { bubbles: true, cancelable: true })
                                const error = new DOMException('Unique key constraint violation.', 'ConstraintError')
                                request.error = error
                                const caught = dispatchEvent(request, event)
                                console.log('???', caught)
                                break SWITCH
                            }
                        }
                        transaction.set(index.qualified, { key: [ extracted, key ] })
                    }
                    transaction.set(properties.qualified, record)
                    dispatchEvent(request, new Event('success'))
                }
                break
            case 'get': {
                    const { name, key, request } = event
                    const properties = schema.store[schema.name[name]]
                    const got = await transaction.get(properties.qualified, [ key ])
                    request.result = Verbatim.deserialize(Verbatim.serialize(got.value))
                    dispatchEvent(request, new Event('success'))
                }
                break
            case 'openCursor': {
                    const { name, request, cursor } = event
                    const properties = schema.store[schema.name[name]]
                    console.log('openCursor', !! request)
                    console.log(`store.${name}`)
                    cursor._outer = { iterator: transaction.cursor(properties.qualified).iterator()[Symbol.asyncIterator](), next: null }
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
                        console.log('????', next.value)
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
