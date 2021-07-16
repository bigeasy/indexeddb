const assert = require('assert')

const compare = require('./compare')

const rescue = require('rescue')
const { Future } = require('perhaps')
const { dispatchEvent } = require('./dispatch')

const Verbatim = require('verbatim')

const { vivify } = require('./setter')
const { valuify, MAX } = require('./value')
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

    async _next ({ store, request, cursor }, transaction) {
        FOREVER: for (;;) {
            const next = cursor._inner.next()
            if (next.done) {
                cursor._outer.next = await cursor._outer.iterator.next()
                if (cursor._outer.next.done) {
                    if (cursor._unique != null) {
                        const got = { key: cursor._unique.key[0], value: await transaction.get(store.qualified, [ cursor._unique.key[1] ]) }
                        cursor._unique = null
                        return got
                    }
                    return null
                } else {
                    cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                }
            } else {
                switch (cursor._type) {
                case 'store': {
                        return { key: next.value.key, value: next.value }
                    }
                case 'index': {
                        if (cursor._direction == 'prevunique') {
                            let previous = cursor._unique
                            cursor._unique = next.value
                            if (previous != null) {
                                if (compare(this._globalObject, previous.key[0], next.value.key[0]) != 0) {
                                    return { key: previous.key[0], value: await transaction.get(store.qualified, [ previous.key[1] ]) }
                                }
                            }
                        } else {
                            return { key: next.value.key[0], value: await transaction.get(store.qualified, [ next.value.key[1] ]) }
                        }
                    }
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

    _extractIndexed (index, value) {
        const values = []
        const extracted = this._schema.getExtractor(index.id)(value)
        if (index.multiEntry && Array.isArray(extracted)) {
            for (const value of extracted) {
                try {
                    values.push(valuify(this._globalObject, value))
                } catch (error) {
                    // **TODO** Why doesn't `{ name: 'DataError' }` work. Step through
                    // it with `test/idbobjectstore_add14.wpt.t.js`.
                    rescue(error, [ this._globalObject.DOMException ])
                }
            }
        } else {
            try {
                values.push(valuify(this._globalObject, extracted))
            } catch (error) {
                // **TODO** Why doesn't `{ name: 'DataError' }` work. Step through
                // it with `test/idbobjectstore_add14.wpt.t.js`.
                rescue(error, [ this._globalObject.DOMException ])
            }
        }
        return values
    }

    _dispatchItem ({ cursor, request }, got) {
        request.readyState = 'done'
        if (got == null) {
            request._result = null
        } else {
            cursor._key = got.key
            cursor._value = got.value
            cursor._gotValue = true
        }
        return dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
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
                                    for (const value of this._extractIndexed(index, item.value)) {
                                        transaction.set(index.qualified, { key: [ value, item.key ] })
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
                    const got = await transaction.get(store.qualified, [ key ])
                    if (got != null) {
                        if (! overwrite) {
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
                        for (const indexName in store.index) {
                            const index = this._schema._pending.store[store.index[indexName]]
                            if (! index.extant) {
                                continue
                            }
                            const values = this._extractIndexed(index, got.value)
                            for (const value of values) {
                                transaction.unset(index.qualified, [[ value, key ]])
                            }
                        }
                    }
                    request._result = key
                    const record = { key, value }
                    for (const indexName in store.index) {
                        const index = this._schema._pending.store[store.index[indexName]]
                        if (! index.extant) {
                            continue
                        }
                        const values = this._extractIndexed(index, record.value)
                        for (const value of values) {
                            if (index.unique) {
                                const got = await transaction.cursor(index.qualified, [[ value ]])
                                                             .terminate(item => compare(this._globalObject, item.key[0], value) != 0)
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
                            transaction.set(index.qualified, { key: [ value, key ] })
                        }
                    }
                    transaction.set(store.qualified, record)
                    request.readyState = 'done'
                    await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success', { bubbles: false, cancelable: false }], {}))
                }
                break
            case 'get': {
                    switch (event.type) {
                    case 'store': {
                            const { store, query, request, keys } = event
                            const got = await transaction.cursor(store.qualified, query.lower ? [ query.lower ] : null)
                                                         .terminate(item => ! query.includes(item.key))
                                                         .limit(1)
                                                         .array()
                            if (got.length != 0) {
                                request._result = Verbatim.deserialize(Verbatim.serialize(keys ? got[0].key : got[0].value))
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    case 'index': {
                            const { store, query, index, key, request } = event
                            // TODO What if query lower is `null` but query upper is not?
                            const cursor = query.lower == null
                                ? transaction.cursor(index.qualified)
                                : transaction.cursor(index.qualified, [[ query.lower ]])
                            const indexGot = await cursor.terminate(item => ! query.includes(item.key[0])).limit(1).array()
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
                            const { store, query, count, request, keys } = event
                            const cursor = transaction.cursor(store.qualified, query.lower == null ? null : [ query.lower ])
                            const terminated = query.lower == null ? cursor : cursor.terminate(item => ! query.includes(item.key))
                            const limited = count == null || count == 0 ? terminated : cursor.limit(count)
                            const exclusive = query.lower != null && query.lowerOpen ? limited.exclusive() : limited
                            const array = await exclusive.array()
                            if (keys) {
                                request._result = array.map(item => item.key)
                            } else {
                                request._result = array.map(item => item.value)
                            }
                            request.readyState = 'done'
                            await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                        }
                        break
                    case 'index': {
                            const { store, index, query, count, request, keys } = event
                            const cursor = transaction.cursor(index.qualified, query.lower == null ? null : [[ query.lower ]])
                            const terminated = query.lower == null ? cursor : cursor.terminate(item => ! query.includes(item.key[0]))
                            const limited = count == null || count == 0 ? terminated : cursor.limit(count)
                            const exclusive = query.lower != null && query.lowerOpen ? limited.skip(item => {
                                return compare(this._globalObject, item.key[0][0][0], query.lower) == 0
                            }) : limited
                            // TODO Use Memento join.
                            // TODO Do a structured copy.
                            request._result = []
                            for await (const items of exclusive) {
                                for (const item of items) {
                                    const got = await transaction.get(store.qualified, [ item.key[1] ])
                                    request._result.push(keys ? got.key : got.value)
                                }
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
                                builder = query.lower == null
                                    ? transaction.cursor(store.qualified)
                                    : transaction.cursor(store.qualified, [ query.lower ])
                                if (query.upper != null) {
                                    builder = builder.terminate(item => ! query.includes(item.key))
                                }
                            } else {
                                builder = query.upper == null
                                    ? transaction.cursor(store.qualified)
                                    : transaction.cursor(store.qualified, [ query.upper ])
                                if (query.lower != null) {
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
                                const got = await this._next(event)
                                await this._dispatchItem(event, got)
                            }
                        }
                        break
                    case 'index': {
                            const { query, store, index, request, cursor, direction } = event
                            let builder
                            switch (direction) {
                            case 'next':
                            case 'nextunique': {
                                    // TODO Seems like you need to sort out what lowerOpen
                                    // means, maybe translate that to `_exclusive` inside the
                                    // object because you forget, or at least leave a comment.
                                    builder = transaction.cursor(index.qualified, query.lower == null ? null : [[ query.lower ]])
                                    builder = query.lower != null && query.lowerOpen ? builder.skip(item => {
                                        return compare(this._globalObject, item.key[0][0][0], query.lower) == 0
                                    }) : builder
                                    if (query.upper != null) {
                                        builder = builder.terminate(item => ! query.includes(item.key[0]))
                                    }
                                }
                                break
                            case 'prev':
                            case 'prevunique': {
                                    builder = transaction.cursor(index.qualified, query.upper == null ? null : [[ query.upper, MAX ]])
                                    builder = builder.reverse()
                                    if (query.lower != null) {
                                        builder = builder.terminate(item => ! query.includes(item.key[0]))
                                    }
                                }
                                break
                            }
                            cursor._outer = { iterator: builder[Symbol.asyncIterator](), next: null }
                            cursor._outer.next = await cursor._outer.iterator.next()
                            if (cursor._outer.next.done) {
                                request._result = null
                                request.readyState = 'done'
                                await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                            } else {
                                cursor._inner = cursor._outer.next.value[Symbol.iterator]()
                                const got = await this._next(event, transaction)
                                await this._dispatchItem(event, got)
                            }
                        }
                        break
                    }
                }
                break
            case 'continue': {
                    const { store, request, cursor, key, primaryKey } = event
                    if (primaryKey == null) {
                        for (;;) {
                            const got = await this._next(event, transaction)
                            if (
                                got == null ||
                                key == null ||
                                compare(this._globalObject, key, got.key) <= 0
                            ) {
                                await this._dispatchItem(event, got)
                                break
                            }
                        }
                    } else {
                        for (;;) {
                            const got = await this._next(event, transaction)
                            if (
                                got == null
                                ||
                                (
                                    compare(this._globalObject, got.key, key) == 0 &&
                                    compare(this._globalObject, got.value.key, primaryKey) >= 0
                                )
                                ||
                                compare(this._globalObject, got.key, key) > 0
                            ) {
                                await this._dispatchItem(event, got)
                                break
                            }
                        }
                    }
                }
                break
            case 'advance': {
                    const { store, request, cursor } = event
                    if (cursor._direction == 'prevunique') {
                        throw new Error
                    }
                    let count = event.count - 1
                    // TODO Tighten loop.
                    while (count != 0) {
                        const next = cursor._inner.next()
                        if (next.done) {
                            cursor._outer.next = await cursor._outer.iterator.next()
                            if (cursor._outer.next.done) {
                                request._result = null
                                request.readyState = 'done'
                                await dispatchEvent(this, request, Event.createImpl(this._globalObject, [ 'success' ], {}))
                                break SWITCH
                            }
                        }
                        count--
                    }
                    const got = await this._next(event, transaction)
                    await this._dispatchItem(event, got)
                }
                break
            case 'count': {
                    switch (event.type) {
                    case 'store': {
                            const { store, request, query } = event
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
                    case 'index': {
                            const { index, store, request, query } = event
                            request._result = 0
                            let cursor = query.lower == null ? transaction.cursor(index.qualified) : transaction.cursor(index.qualified, [[ query.lower ]])
                            cursor = query.upper == null ? cursor : cursor.terminate(item => {
                                return ! query.includes(item.key[0])
                            })
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
                    switch (event.type) {
                    case 'store': {
                            const { store } = event
                            transaction.set('schema', store)
                        }
                        break
                    case 'index': {
                            const { store, index } = event
                            transaction.set('schema', store)
                            transaction.set('schema', index)
                        }
                        break
                    }
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
