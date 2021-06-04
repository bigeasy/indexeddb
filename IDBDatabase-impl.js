const { extractify } = require('./extractor')
const { InvalidAccessError, ConstraintError, TransactionInactiveError, InvalidStateError, NotFoundError } = require('./error')
const { createEventAccessor } = require('./living/helpers/create-event-accessor')

const { DOMStringList } = require('./stringlist')

const { Future } = require('perhaps')

const Queue = require('avenue')

const Schema = require('./schema')

const { setupForSimpleEventAccessors } = require('./living/helpers/create-event-accessor')

const IDBObjectStore = require('./living/generated/IDBObjectStore.js')
const IDBTransaction = require('./living/generated/IDBTransaction.js')

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
        const transaction = IDBTransaction.createImpl(this._globalObject, [], { schema: this._schema, database: this._database, mode })
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
        return IDBObjectStore.create(this._globalObject, [], { transaction: this._transaction, schema: this._schema, name })
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

setupForSimpleEventAccessors(IDBDatabaseImpl.prototype, [ 'abort', 'close', 'error', 'versionchange' ]);

module.exports = { implementation: IDBDatabaseImpl }
