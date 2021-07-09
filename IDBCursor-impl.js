const IDBRequest = require('./living/generated/IDBRequest')
const Verbatim = require('verbatim')

class IDBCursorImpl {
    constructor (globaObject, [], { type, transaction, store, request, direction, source }) {
        this._globalObject = globaObject
        this._type = type
        this._store = store
        this._request = request
        this._transaction = transaction
        this._direction = direction
        this._source = source
        this._gotValue = false
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
            request: this._request,
            // TODO Probably do not need this defensive copy.
            store: JSON.parse(JSON.stringify(this._store))
        })
    }

    continue (key) {
        this._transaction._queue.push({
            method: 'item',
            type: this._type,
            cursor: this,
            request: this._request,
            store: JSON.parse(JSON.stringify(this._store))
        })
    }

    continuePrimaryKey (key, primaryKey) {
        throw new Error
    }

    update (value) {
        const request = IDBRequest.createImpl(this._globalObject, [], { parent: this._transaction })
        this._transaction._state = 'inactive'
        value = Verbatim.deserialize(Verbatim.serialize(value)),
        this._transaction._state = 'active'
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
        throw new Error
    }
}

module.exports = { implementation:  IDBCursorImpl }
