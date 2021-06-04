const { DBObjectStore } = require('./store')
const { DBRequest } = require('./_request')
const { DBTransaction } = require('./transaction')
const { extractify } = require('./extractor')
const { InvalidAccessError, ConstraintError, TransactionInactiveError, InvalidStateError, NotFoundError } = require('./error')
const { EventTarget } = require('./interfaces')
const { createEventAccessor } = require('./living/helpers/create-event-accessor')

const { DOMStringList } = require('./stringlist')

const { Future } = require('perhaps')

const Queue = require('avenue')

const Schema = require('./schema')

class DBDatabase extends EventTarget {
    constructor (name, schema, transactor, version) {
        super()
        this._schema = schema
        this._transactor = transactor
        this._transaction = null
        this._closing = false
        this._closed = new Future
        this._name = name
        this._version = version
        this._transactions = new Set
    }

    get onversionchange () {
        return getEventAttributeValue(this, 'versionchange')
    }

    set onversionchange (value) {
        setEventAttributeValue(this, 'versionchange', value)
    }

    get name () {
        return this._name
    }

    get version () {
        return this._version
    }

    get objectStoreNames () {
        const list =  new DOMStringList()
        list.push.apply(list, this._schema.getObjectStoreNames())
        return list
    }

    transaction (names, mode = 'readonly') {
        if (this._transaction != null) {
            throw new InvalidStateError
        }
        if (this._closing) {
            throw new InvalidStateError
        }
        if (typeof names == 'string') {
            names = [ names ]
        }
        for (const name of names) {
            debugger
            if (! this._schema.getObjectStore(name)) {
                throw new NotFoundError
            }
        }
        if (names.length == 0) {
            throw new InvalidAccessError
        }
        if (mode != 'readonly' && mode != 'readwrite') {
            throw new TypeError
        }
        const request = new DBRequest
        const transaction =  new DBTransaction(this._schema, this._database, mode)
        this._transactions.add(transaction)
        this._transactor.transaction({ db: this, transaction }, names, mode == 'readonly')
        return transaction
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        if (this._transaction == null) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new TransactionInactiveError
        }
        if (this._schema.getObjectStore(name) != null) {
            throw new ConstraintError
        }
        const store = this._schema.createObjectStore(name, keyPath, autoIncrement)
        this._transaction._queue.push({ method: 'create', type: 'store', store: store })
        console.log(this._schema.getObjectStore(name))
        return new DBObjectStore(this._transaction, this._schema, name)
    }

    deleteObjectStore (name) {
        if (name === undefined) {
            throw new TypeError
        }
        if (this._transaction == null) {
            throw new InvalidStateError
        }
        if (this._transaction._state != 'active') {
            throw new TransactionInactiveError
        }
        const store = this._schema.getObjectStore(name)
        if (store == null) {
            throw new NotFoundError
        }
        this._schema.deleteObjectStore(name)
        this._transaction._queue.push({ method: 'destroy', store: store })
    }

    // https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-close
    close () {
        this._closing = true
        this._transactor.queue.push({ method: 'close', extra: { db: this } })
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase
