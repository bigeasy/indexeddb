const assert = require('assert')

const compare = require('./compare')

const rescue = require('rescue')
const { Future } = require('perhaps')
const { dispatchEvent } = require('./dispatch')

const Verbatim = require('verbatim')

const { vivify } = require('./setter')
const { valuify } = require('./value')
const { Queue } = require('avenue')

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

const EventTarget = require('./living/generated/EventTarget')
const Event = require('./living/generated/Event')
const IDBRequest = require('./living/generated/IDBRequest')
const IDBOpenDBRequest = require('./living/generated/IDBOpenDBRequest')
const IDBVersionChangeEvent = require('./living/generated/IDBVersionChangeEvent')
const IDBObjectStore = require('./living/generated/IDBObjectStore')

const DOMStringList = require('./living/generated/DOMStringList')
const DOMException = require('domexception/lib/DOMException')

const EventTargetImpl = require('./living/idl/EventTarget-impl').implementation

const webidl = require('./living/generated/utils')

class IDBTransactionImpl extends EventTargetImpl {
    constructor (globalObject, args, { schema, request = null, database, mode, names = [], previousVersion = null, durability }) {
        super(globalObject, [], {})
        if (mode == null) {
            throw new Error
        }
        this.durability = durability
        this._globalObject = globalObject
        this._schema = schema
        this._state = 'active'
        this._database = database
        this._request = request
        this._queue = []
        this._mode = mode
        this._names = names
        this._previousVersion = previousVersion
    }

    get objectStoreNames () {
        const array = this._names.length == 0 ? this._schema.getObjectStoreNames().sort() : this._names.sort()
        return DOMStringList.create(this._globalObject, [], { array })
    }

    get mode () {
        return this._mode
    }


    get db () {
        return this._database
    }

    _getTheParent() {
        return this._database
    }

    objectStore (name) {
        if (this._state == 'finished') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (
            this._names.length == 0
                ? this._schema.getObjectStore(name) == null
                : !~this._names.indexOf(name)
        ) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'NotFoundError' ], {})
        }
        return IDBObjectStore.create(this._globalObject, [], { transaction: this, schema: this._schema, name })
    }

    // **TODO** What happens in a double abort?
    abort () {
        this._state = 'finished'
        this._schema.abort()
        if (this._mode == 'versionchange') {
            this._database.version = this._previousVersion
        }
        this._aborted = true
    }

    async _item ({ type, store, request, cursor }, transaction) {
        FOREVER: for (;;) {
            const next = cursor._inner.next()
            if (next.done) {
                cursor._outer.next = await cursor._outer.iterator.next()
                if (cursor._outer.next.done) {
                    request._result = null
                    request.readyState = 'done'
                    await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                    break
                } else {
                    cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                }
            } else {
                switch (type) {
                case 'store': {
                        cursor._value = next.value
                        cursor._key = next.value.key
                        request.readyState = 'done'
                        await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                    }
                    break FOREVER
                case 'index': {
                        cursor._key = next.value.key[0]
                        cursor._value = await transaction.get(store.qualified, [ next.value.key[1] ])
                        request.readyState = 'done'
                        await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                    }
                    break FOREVER
                }
            }
        }
    }

    async _delete (transaction, store, { key, value }) {
        transaction.unset(store.qualified, [ key ])
        for (const indexName in store.index) {
            const index = this._schema._pending.store[store.index[indexName]]
            if (! index.extant) {
                continue
            }
            let extracted
            try {
                extracted = valuify(this._globalObject, this._schema.getExtractor(index.id)(value))
            } catch (error) {
                // **TODO** Why doesn't `{ name: 'DataError' }` work. Step through
                // it with `test/idbobjectstore_add14.wpt.t.js`.
                rescue(error, [ this._globalObject.DOMException ])
                continue
            }
            transaction.unset(index.qualified, [[ extracted, key ]])
        }
    }

    // Most of the logic of this implementation is in this one function.
    // The interface implementations do a lot of argument validation, but
    // most of the real work is here.

    //
    async _run (transaction) {
        await new Promise(resolve => setImmediate(resolve))
        while (this._queue.length != 0) {
            const event = this._queue.shift()
            if (this._state == 'finished') {
                const { request } = event
                if (request != null) {
                    delete request._result
                    request.readyState = 'done'
                    request._error = DOMException.create(this._globalObject, [ 'TODO: message', 'AbortError' ], {})
                    await dispatchEvent(null, request, Event.createImpl(this._globalObject, [ 'error', { bubbles: true, cancelable: true } ], {}))
                }
                continue
            }
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
                            for await (const items of transaction.cursor(store.qualified)) {
                                for (const item of items) {
                                    const extracted = extractor(item.value)
                                    if (extracted != null) {
                                        transaction.set(index.qualified, { key: [ extracted, item.key ] })
                                    }
                                }
                            }
                            if (index.unique) {
                                let previous = null, count = 0
                                OUTER: for await (const items of transaction.cursor(index.qualified)) {
                                    for (const item of items) {
                                        if (count++ == 0) {
                                            previous = item
                                            continue
                                        }
                                        if (compare(this._globalObject, previous.key[0], item.key[0]) == 0) {
                                            this.error = DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
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
            case 'set': {
                    const { store, key, value, overwrite, request } = event
                    if (! overwrite) {
                        const got = await transaction.get(store.qualified, [ key ])
                        if (got != null) {
                            const event = Event.createImpl(this._globalObject, [ 'error', { bubbles: true, cancelable: true } ], {})
                            const error = DOMException.create(this._globalObject, [ 'Unique key constraint violation.', 'ConstraintError' ], {})
                            request.readyState = 'done'
                            request._error = error
                            const caught = await dispatchEvent(null, request, event)
                            if (!event._canceledFlag) {
                                this.abort()
                            }
                            console.log('???', caught)
                            break SWITCH
                        }
                    }
                    request._result = key
                    const record = { key, value }
                    for (const indexName in store.index) {
                        const index = this._schema._pending.store[store.index[indexName]]
                        if (! index.extant) {
                            continue
                        }
                        let extracted
                        try {
                            extracted = valuify(this._globalObject, this._schema.getExtractor(index.id)(record.value))
                        } catch (error) {
                            // **TODO** Why doesn't `{ name: 'DataError' }` work. Step through
                            // it with `test/idbobjectstore_add14.wpt.t.js`.
                            rescue(error, [ this._globalObject.DOMException ])
                            continue
                        }
                        if (index.unique) {
                            const got = await transaction.cursor(index.qualified, [[ extracted ]])
                                                         .terminate(item => compare(this._globalObject, item.key[0], extracted) != 0)
                                                         .array()
                            if (got.length != 0) {
                                const event = Event.createImpl(this._globalObject, [ 'error', { bubbles: true, cancelable: true } ], {})
                                const error = DOMException.create(this._globalObject, [ 'Unique key constraint violation.', 'ConstraintError' ], {})
                                request.readyState = 'done'
                                request._error = error
                                await dispatchEvent(this, request, event)
                                if (!event._canceledFlag) {
                                    this.error = DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
                                    this.abort()
                                }
                                break SWITCH
                            }
                        }
                        transaction.set(index.qualified, { key: [ extracted, key ] })
                    }
                    transaction.set(store.qualified, record)
                    request.readyState = 'done'
                    await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success', { bubbles: false, cancelable: false }], {}))
                }
                break
            case 'get': {
                    switch (event.type) {
                    case 'store': {
                            const { store, query, request, key } = event
                            const got = await transaction.cursor(store.qualified, [ query.lower ])
                                                         .terminate(item => ! query.includes(item.key))
                                                         .limit(1)
                                                         .array()
                            if (got.length != 0) {
                                request._result = Verbatim.deserialize(Verbatim.serialize(key ? got[0].key : got[0].value))
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    case 'index': {
                            const { store, query, index, key, request } = event
                            const indexGot = await transaction.cursor(index.qualified, [[ query.lower ]])
                                                              .terminate(item => ! query.includes(item.key[0]))
                                                              .limit(1)
                                                              .array()
                            if (indexGot.length != 0) {
                                const got = await transaction.get(store.qualified, [ indexGot[0].key[1] ])
                                request._result = Verbatim.deserialize(Verbatim.serialize(key ? got.key : got.value))
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    }
                }
                break
            case 'getAll': {
                    switch (event.type) {
                    case 'store': {
                            const { store, query, count, request, key } = event
                            const cursor = transaction.cursor(store.qualified, query == null ? null : [ query.lower ])
                            const terminated = query == null ? cursor : cursor.terminate(item => ! query.includes(item.key))
                            const limited = count == null || count == 0 ? terminated : cursor.limit(count)
                            const exclusive = query != null && query.lowerOpen ? limited.exclusive() : limited
                            const array = await exclusive.array()
                            if (key) {
                                request._result = array.map(item => item.key)
                            } else {
                                request._result = array.map(item => item.value)
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    }
                }
                break
            case 'openCursor': {
                    switch (event.type) {
                    case 'store': {
                            const { store, request, cursor, direction, query } = event
                            let builder
                            if (direction == 'next') {
                                builder = query == null
                                    ? transaction.cursor(store.qualified)
                                    : transaction.cursor(store.qualified, [ query.lower ])
                                if (query != null && query.upper != null) {
                                    builder = builder.terminate(item => ! query.includes(item.key))
                                }
                            } else {
                                builder = query == null
                                    ? transaction.cursor(store.qualified)
                                    : transaction.cursor(store.qualified, [ query.upper ])
                                if (query != null && query.lower != null) {
                                    builder = builder.terminate(item => ! query.includes(item.key))
                                }
                                builder = builder.reverse()
                            }
                            cursor._outer = { iterator: builder[Symbol.asyncIterator](), next: null }
                            cursor._outer.next = await cursor._outer.iterator.next()
                            if (cursor._outer.next.done) {
                                request._result = null
                                request.readyState = 'done'
                                await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                            } else {
                                cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                                await this._item(event)
                            }
                        }
                        break
                    case 'index': {
                            const { store, index, request, cursor, direction } = event
                            let builder = transaction.cursor(index.qualified)
                            if (direction == 'prev') {
                                builder = builder.reverse()
                            }
                            cursor._outer = { iterator: builder[Symbol.asyncIterator](), next: null }
                            cursor._outer.next = await cursor._outer.iterator.next()
                            if (cursor._outer.next.done) {
                                request._result = null
                                request.readyState = 'done'
                                await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                            } else {
                                cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                                await this._item(event, transaction)
                            }
                        }
                        break
                    }
                }
                break
            case 'item': {
                    await this._item(event, transaction)
                }
                break
            case 'count': {
                    const { store, request, query } = event
                    switch (store.type) {
                    case 'store': {
                            request._result = 0
                            let cursor = query.lower == null ? transaction.cursor(store.qualified) : transaction.cursor(store.qualified, [ query.lower ])
                            cursor = query.upper == null ? cursor : cursor.terminate(item => ! query.includes(item.key))
                            for await (const items of cursor) {
                                for (const item of items) {
                                    request._result++
                                }
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    }
                }
                break
            case 'clear': {
                    const { store, request } = event
                    // TODO Really do not need iterator do I?
                    for await (const items of transaction.cursor(store.qualified)) {
                        for (const item of items) {
                            this._delete(transaction, store, item)
                        }
                    }
                    // TODO Clear an index.
                    request.readyState = 'done'
                    await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                }
                break
            case 'delete': {
                    const { store, request, query } = event
                    let cursor = query.lower == null ? transaction.cursor(store.qualified) : transaction.cursor(store.qualified, [ query.lower ])
                    cursor = query.upper == null ? cursor : cursor.terminate(item => ! query.includes(item.key))
                    for await (const items of cursor) {
                        for (const item of items) {
                            transaction.unset(store.qualified, [ item.key ])
                        }
                    }
                    request.readyState = 'done'
                    await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                }
                break
            case 'rename': {
                    const { store } = event
                    transaction.set('schema', store)
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
            // **TODO** I unset this here and in IDBFactory, so spaghetti.
            this._database._transaction = null
            await dispatchEvent(null, this, Event.createImpl(this._globalObject, [ 'abort', { bubbles: true, cancelable: true } ], {}))
            // Must do this immediately before transaction rollback.
            if (this._request) {
                this._request.transaction = null
            }
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
            this._database._transaction = null
            await dispatchEvent(null, this, Event.createImpl(this._globalObject, [ 'complete' ], {}))
            if (this._request) {
                this._request.transaction = null
            }
        }
    }
}

setupForSimpleEventAccessors(IDBTransactionImpl.prototype, [ 'complete', 'abort', 'error' ]);

module.exports = { implementation: IDBTransactionImpl }
