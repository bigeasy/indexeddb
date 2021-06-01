const assert = require('assert')

const compare = require('./compare')

const rescue = require('rescue')
const { InvalidStateError, AbortError, DataError } = require('./error')
const { Future } = require('perhaps')
const { Event } = require('event-target-shim')
const { dispatchEvent } = require('./dispatch')

const Verbatim = require('verbatim')
const DOMException = require('domexception')

const { extractify } = require('./extractor')
const { vivify } = require('./setter')
const { valuify } = require('./value')
const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')
const { EventTarget, getEventAttributeValue, setEventAttributeValue } = require('event-target-shim')

class DBTransaction extends EventTarget {
    constructor (schema, database, mode, previousVersion) {
        super()
        if (mode == null) {
            throw new Error
        }
        this._schema = schema
        this._state = 'active'
        this._database = database
        this._queue = []
        this._mode = mode
        this._previousVersion = previousVersion
    }

    get onabort () {
        return getEventAttributeValue(this, 'abort')
    }

    set onabort (value) {
        setEventAttributeValue(this, 'abort', value)
    }

    get oncomplete () {
        return getEventAttributeValue(this, 'complete')
    }

    set oncomplete (value) {
        setEventAttributeValue(this, 'complete', value)
    }

    get objectStoreNames () {
    }

    get mode () {
        return this._mode
    }


    get db () {
        return this._database
    }

    get error () {
    }

    objectStore (name) {
        if (this._state == 'finished') {
            throw new InvalidStateError
        }
        return new DBObjectStore(this, this._schema, name)
    }

    abort () {
        this._state = 'finished'
        this._schema.abort()
        if (this._mode == 'versionchange') {
            this._database._version = this._previousVersion
        }
        // Mark any stores created by this transaction as deleted, then queue
        // them for actual destruction.
        //
        while (this._queue.length != 0) {
            const event = this._queue.shift()
            if ('request' in event) {
                const { request } = event
                delete request.result
                request.error = new AbortError
                dispatchEvent(null, request, new Event('error'))
            }
        }
        dispatchEvent(null, this, new Event('abort'))
    }

    async _item ({ request, cursor }) {
        for (;;) {
            const next = cursor._inner.next()
            if (next.done) {
                cursor._outer.next = await cursor._outer.iterator.next()
                if (cursor._outer.next.done) {
                    request.result = null
                    dispatchEvent(this, request, new Event('success'))
                    break
                } else {
                    cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                }
            } else {
                cursor._value = next.value
                dispatchEvent(this, request, new Event('success'))
                break
            }
        }
    }

    // Most of the logic of this implementation is in this one function.
    // The interface implementations do a lot of argument validation, but
    // most of the real work is here.

    //
    async _run (transaction, names) {
        await new Promise(resolve => setImmediate(resolve))
        while (this._queue.length != 0) {
            const event = this._queue.shift()
            SWITCH: switch (event.method) {
            // Don't worry about rollback of the update to the schema object. We
            // are not going to use this object if the upgrade fails.
            case 'create': {
                    switch (event.type) {
                    case 'store': {
                            const { store } = event
                            transaction.set('schema', store)
                            await transaction.store(store.qualified, { key: 'indexeddb' })
                        }
                        break
                    case 'index': {
                            const { store, index } = event
                            await transaction.store(index.qualified, { key: 'indexeddb' })
                            transaction.set('schema', store)
                            transaction.set('schema', index)
                            const extractor = this._schema.getExtractor(index.id)
                            for await (const items of transaction.cursor(store.qualified).iterator()) {
                                for (const item of items) {
                                    const extracted = extractor(item.value)
                                    transaction.set(index.qualified, { key: [ extracted, item.key ] })
                                }
                            }
                            if (index.unique) {
                                let previous = null, count = 0
                                OUTER: for await (const items of transaction.cursor(index.qualified).iterator()) {
                                    for (const item of items) {
                                        if (count++ == 0) {
                                            previous = item
                                            continue
                                        }
                                        if (compare(previous.key[0], item.key[0]) == 0) {
                                            this.abort()
                                            break OUTER
                                        }
                                        previous = item
                                    }
                                }
                            }
                            index.extant = true
                        }
                        break
                    }
                }
                break
            case 'deleteStore': {
                    const { id } = event
                }
                break
            case 'index': {
                }
                break
            case 'add': {
                    let { store, key, value, request } = event
                    if (store.deleted) {
                        continue
                    }
                    event.value = value = Verbatim.deserialize(Verbatim.serialize(value))
                    if (key == null) {
                        event.key = key = ++store.autoIncrement
                        if (store.keyPath != null) {
                            vivify(value, store.keyPath, key)
                        }
                    }
                    const got = await transaction.get(store.qualified, [ key ])
                    if (got != null) {
                        const event = new Event('error', { bubbles: true, cancelable: true })
                        const error = new DOMException('Unique key constraint violation.', 'ConstraintError')
                        request.error = error
                        const caught = dispatchEvent(this, request, event)
                        console.log('???', caught)
                        break SWITCH
                    }
                }
                /* fall through */
            case 'put': {
                    // TODO Move extraction into store interface.
                    let { store, key, value, request } = event
                    if (store.deleted) {
                        continue
                    }
                    value = Verbatim.deserialize(Verbatim.serialize(value))
                    if (key == null) {
                        key = ++store.autoIncrement
                        if (store.keyPath != null) {
                            vivify(value, store.keyPath, key)
                        }
                    }
                    const record = { key, value }
                    for (const indexName in store.index) {
                        const index = this._schema.getIndex(store.name, indexName)
                        if (! index.extant) {
                            continue
                        }
                        let extracted
                        try {
                            extracted = valuify(this._schema.getExtractor(index.id)(record.value))
                        } catch (error) {
                            rescue(error, [ DataError ])
                            continue
                        }
                        if (index.unique) {
                            const got = await transaction.cursor(index.qualified, [[ extracted ]])
                                                         .terminate(item => compare(item.key[0], extracted) != 0)
                                                         .array()
                            if (got.length != 0) {
                                const event = new Event('error', { bubbles: true, cancelable: true })
                                const error = new DOMException('Unique key constraint violation.', 'ConstraintError')
                                request.error = error
                                const caught = dispatchEvent(this, request, event)
                                console.log('???', caught)
                                break SWITCH
                            }
                        }
                        transaction.set(index.qualified, { key: [ extracted, key ] })
                    }
                    transaction.set(store.qualified, record)
                    dispatchEvent(this, request, new Event('success'))
                }
                break
            case 'get': {
                    switch (event.type) {
                    case 'store': {
                            const { store, key, request } = event
                            const got = await transaction.get(store.qualified, [ key ])
                            if (got != null) {
                                request.result = Verbatim.deserialize(Verbatim.serialize(got.value))
                            }
                            dispatchEvent(this, request, new Event('success'))
                        }
                        break
                    case 'index': {
                            const { store, key, index, query, request } = event
                            const indexGot = await transaction.cursor(index.qualified, [[ query.lower ]])
                                                              .terminate(item => ! query.includes(item.key[0]))
                                                              .array()
                            if (indexGot.length != 0) {
                                const got = await transaction.get(store.qualified, [ indexGot[0].key[1] ])
                                request.result = Verbatim.deserialize(Verbatim.serialize(key ? got.key : got.value))
                            }
                            dispatchEvent(this, request, new Event('success'))
                        }
                        break
                    }
                }
                break
            case 'openCursor': {
                    const { store, request, cursor, direction } = event
                    let builder = transaction.cursor(store.qualified)
                    if (direction == 'prev') {
                        builder.reverse()
                    }
                    cursor._outer = { iterator: builder.iterator()[Symbol.asyncIterator](), next: null }
                    cursor._outer.next = await cursor._outer.iterator.next()
                    if (cursor._outer.next.done) {
                        request.result = null
                        dispatchEvent(this, request, new Event('success'))
                    } else {
                        cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                        await this._item(event)
                    }
                }
                break
            case 'item': {
                    await this._item(event)
                }
                break
            case 'count': {
                    const { store, request, query } = event
                    switch (store.type) {
                    case 'store': {
                            request.result = 0
                            let cursor = query.lower == null ? transaction.cursor(store.qualified) : transaction.cursor(store.qualified, [ query.lower ])
                            cursor = query.upper == null ? cursor : cursor.terminate(item => ! query.includes(item.key))
                            for await (const items of cursor.iterator()) {
                                for (const item of items) {
                                    request.result++
                                }
                            }
                            dispatchEvent(this, request, new Event('success'))
                        }
                        break
                    }
                }
                break
            case 'clear': {
                    const { store, request } = event
                    // TODO Really do not need iterator do I?
                    for await (const items of transaction.cursor(store.qualified).iterator()) {
                        for (const item of items) {
                            transaction.unset(store.qualified, [ item.key ])
                        }
                    }
                    // TODO Clear an index.
                    dispatchEvent(this, request, new Event('success'))
                }
                break
            case 'destroy': {
                    switch (event.type) {
                    case 'store': {
                            const { store } = event
                            // **TODO** remove all associated indexes
                            await transaction.remove(store.qualified)
                        }
                        break
                    case 'index': {
                            // **TODO** Remove index from... No, let's just use a
                            // relation between the index and the store.
                            const { index } = event
                            await transaction.remove(index.qualified)
                        }
                        break
                    }
                }
                break
            }
            await new Promise(resolve => setImmediate(resolve))
        }
        if (this._state == 'finished') {
            this._schema.reset()
            if (transaction.rollback) {
                transaction.rollback()
            }
        } else {
            this._state = 'committing'
            if (transaction.commit) {
                await transaction.commit()
            }
            this._schema.merge()
            this._state = 'finished'
            dispatchEvent(null, this, new Event('complete'))
        }
    }
}

exports.DBTransaction = DBTransaction
