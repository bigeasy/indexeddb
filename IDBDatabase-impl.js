const extractor = require('./extractor')
const { createEventAccessor } = require('./living/helpers/create-event-accessor')

const { Future } = require('perhaps')

const Queue = require('avenue')

const Schema = require('./schema')

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

const DOMStringList = require('./living/generated/DOMStringList')
const IDBObjectStore = require('./living/generated/IDBObjectStore.js')
const IDBTransaction = require('./living/generated/IDBTransaction.js')

const DOMException = require('domexception/lib/DOMException')

const EventTargetImpl = require('./living/idl/EventTarget-impl.js').implementation

const webidl = require('./living/generated/utils.js')

class IDBDatabaseImpl extends EventTargetImpl  {
    constructor (globalObject, [], { name, schema, transactor, version }) {
        super(globalObject, [], {})
        this._globalObject = globalObject
        this._schema = schema
        this._transactor = transactor
        this._transaction = null
        this._closing = false
        this._closed = new Future
        this.name = name
        this.version = version
        this._transactions = new Set
    }

    get objectStoreNames () {
        return DOMStringList.create(this._globalObject, [], { array: this._schema.getObjectStoreNames().sort() })
    }

    transaction (names, mode, options) {
        if (this._transaction != null) {
            console.log('has upgrade transatction')
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._closing) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (typeof names == 'string') {
            names = [ names ]
        }
        names = names.filter((name, index) => names.indexOf(name) == index)
        for (const name of names) {
            if (! this._schema.getObjectStore(name)) {
                throw DOMException.create(this._globalObject, [ 'TODO: message', 'NotFoundError' ], {})
            }
        }
        if (names.length == 0) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
        }
        if (mode != 'readonly' && mode != 'readwrite') {
            throw new TypeError
        }
        const transaction = IDBTransaction.createImpl(this._globalObject, [], { schema: this._schema, names, database: this, mode, durability: options.durability })
        this._transactions.add(transaction)
        this._transactor.transaction({ db: this, transaction }, names, mode == 'readonly')
        return webidl.wrapperForImpl(transaction)
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        if (this._transaction == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        const canAutoIncrement = keyPath == null || extractor.verify(this._globalObject, keyPath)
        if (this._schema.getObjectStore(name) != null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'ConstraintError' ], {})
        }
        if (autoIncrement && ! canAutoIncrement) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidAccessError' ], {})
        }
        const store = this._schema.createObjectStore(name, keyPath, autoIncrement)
        this._transaction._queue.push({ method: 'create', type: 'store', store: store })
        return IDBObjectStore.create(this._globalObject, [], { transaction: this._transaction, schema: this._schema, name, constructing: true })
    }

    deleteObjectStore (name) {
        if (name === undefined) {
            throw new TypeError
        }
        if (this._transaction == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'InvalidStateError' ], {})
        }
        if (this._transaction._state != 'active') {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'TransactionInactiveError' ], {})
        }
        const store = this._schema.getObjectStore(name)
        if (store == null) {
            throw DOMException.create(this._globalObject, [ 'TODO: message', 'NotFoundError' ], {})
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

setupForSimpleEventAccessors(IDBDatabaseImpl.prototype, [ 'abort', 'close', 'error', 'versionchange' ]);

module.exports = { implementation: IDBDatabaseImpl }
