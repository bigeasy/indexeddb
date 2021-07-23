const IDBRequest = require('./living/generated/IDBRequest')
const DOMException = require('domexception/lib/DOMException')
const Verbatim = require('verbatim')

const { valuify } = require('./value')

const compare = require('./compare')
const convert = require('./convert')

const structuredClone = require('./structuredClone')

class IDBCursorImpl {
    constructor (globalObject, [], { type, transaction, store, request, direction, source, query, index }) {
        this._globalObject = globalObject
        this._type = type
        this._store = store
        this.request = request
        this._query = query
        this._index = index
        this._transaction = transaction
        this._direction = direction
        this._source = source
        this._gotValue = false
        this._keyOnly = true
    }

    get source () {
        return this._source
    }

    get direction () {
        return this._direction
    }

    get key () {
        return this._key
    }

    get primaryKey () {
        return this._value.key
    }

    advance (count) {
        if (count == 0) {
            throw new TypeError('count must not be zero')
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this.source._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (! this._gotValue) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        this._gotValue = false
        // TODO If the transaction is not active, throw a
        // 'TransactionInactiveError' `DOMExecption`.
        this._transaction._queue.push({
            method: 'advance',
            count: count,
            cursor: this,
            request: this.request,
            // TODO Probably do not need this defensive copy.
            store: JSON.parse(JSON.stringify(this._store))
        })
    }

    continue (key) {
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this.source._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (! this._gotValue) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        key = key == null ? null : convert.key(this._globalObject, key)
        if (key != null) {
            switch (this._direction) {
            case 'next':
            case 'nextunique': {
                    if (compare(this._globalObject, key, this._key) <= 0) {
                        throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                }
                break
            case 'prev':
            case 'prevunique': {
                    if (compare(this._globalObject, key, this._key) >= 0) {
                        throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                }
                break
            }
        }
        this._gotValue = false
        this._transaction._queue.push({
            method: 'continue',
            type: this._type,
            key: key,
            primaryKey: null,
            cursor: this,
            request: this.request,
            store: JSON.parse(JSON.stringify(this._store))
        })
    }

    continuePrimaryKey (key, primaryKey) {
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this.source._isDeleted()) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._type != 'index') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
        }
        if (this._direction.endsWith('unique')) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
        }
        if (! this._gotValue) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        key = key == null ? null : convert.key(this._globalObject, key)
        primaryKey = primaryKey == null ? null : convert.key(this._globalObject, primaryKey)
        switch (this._direction) {
        case 'next': {
                const test = compare(this._globalObject, key, this._key)
                if (test < 0) {
                    throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                } else if (test == 0) {
                    if (compare(this._globalObject, primaryKey, this._value.key) <= 0) {
                        throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                }
            }
            break
        case 'prev': {
                const test = compare(this._globalObject, key, this._key)
                if (test > 0) {
                    throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                } else if (test == 0) {
                    if (compare(this._globalObject, primaryKey, this._value.key) >= 0) {
                        throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
                    }
                }
            }
            break
        default: {
                throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
            }
            break
        }
        this._gotValue = false
        this._transaction._queue.push({
            method: 'item',
            type: this._type,
            key: key,
            primaryKey: primaryKey,
            cursor: this,
            request: this.request,
            store: JSON.parse(JSON.stringify(this._store))
        })
    }

    update (value) {
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._transaction._mode == 'readonly') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ReadOnlyError' ], {})
        }
        if (this.source._isDeleted() || ! this._gotValue || this._keyOnly) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        const request = IDBRequest.createImpl(this._globalObject, [], {
            transaction: this._transaction, source: this
        })
        // Transaction must not be active during a structured clone.
        try {
            this._transaction._state = 'inactive'
            value = structuredClone(this._globalObject, value)
        } finally {
            this._transaction._state = 'active'
        }
        if (this._store.keyPath != null) {
            const key = valuify(this._globalObject, (this.source.objectStore || this.source)._schema.getExtractor(this._store.id)(value))
            if (compare(this._globalObject, key, this._value.key) != 0) {
                throw DOMException.create(this._globalObject, [ 'TODO: message', 'DataError' ], {})
            }
        }
        this._transaction._queue.push({
            method: 'set',
            overwrite: true,
            request: request,
            type: this._type,
            key: this._value.key,
            value: value,
            store: JSON.parse(JSON.stringify(this._store))
        })
        return request
    }

    delete () {
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        if (this._transaction._mode == 'readonly') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ReadOnlyError' ], {})
        }
        if (this.source._isDeleted() || ! this._gotValue || this._keyOnly) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        const request = IDBRequest.createImpl(this._globalObject, [], {
            // **TODO** parent is always transaction, so...
            transaction: this._transaction, source: this
        })
        this._transaction._queue.push({
            method: 'delete',
            store: JSON.parse(JSON.stringify(this._store)),
            request: request,
            query:
            this._globalObject.IDBKeyRange.only(convert.key(this._globalObject, this._value.key))
        })
        return request
    }
}

module.exports = { implementation:  IDBCursorImpl }
