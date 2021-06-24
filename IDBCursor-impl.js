const IDBRequest = require('./living/generated/IDBRequest')
const Verbatim = require('verbatim')

class IDBCursorImpl {
    constructor (globaObject, [], { type, transaction, store, request, query, direction }) {
        this._globalObject = globaObject
        this._type = type
        this._store = store
        this._request = request
        this._transaction = transaction
        this._query = query
        this._direction = direction
    }

    get source () {
        throw new Error
    }

    get direction () {
        return this._direction
    }

    get key () {
        return this._value.key
    }

    get primaryKey () {
        return this._value.key
    }

    advance (count) {
        if (count == 0) {
            throw new TypeError('count must not be zero')
        }
        // TODO If the transaction is not active, throw a
        // 'TransactionInactiveError' `DOMExecption`.
        throw new Error
    }

    continue (key) {
        this._transaction._queue.push({
            method: 'item',
            type: this._type,
            cursor: this,
            request: this._request
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
