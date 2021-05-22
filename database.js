const { DBObjectStore } = require('./store')
const { DBRequest } = require('./request')
const { DBTransaction } = require('./transaction')
const { extractify } = require('./extractor')

const Queue = require('avenue')

const Loop = require('./loop')

class DBDatabase {
    constructor (schema, transactor, loop, mode) {
        this._schema = schema
        this._transactor = transactor
        this._loop = loop
        this._mode = mode
    }

    get name () {
        return this._name
    }

    get version () {
        throw new Error
    }

    get objectStoreNames () {
        throw new Error
    }

    transaction (names, mode = 'readonly') {
        if (typeof names == 'string') {
            names = [ names ]
        }
        const request = new DBRequest
        const loop = new Loop
        this._transactor.transaction(loop, names, mode == 'readonly')
        return new DBTransaction(this._schema, this._database, loop, mode)
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        const id = this._schema.max++
        const schema = this._schema.store[id] = {
            type: 'store',
            id: id,
            name: name,
            qualified: `store.${id}`,
            keyPath: keyPath,
            autoIncrement: autoIncrement ? 0 : null,
            indices: {}
        }
        this._schema.name[name] = id
        const extractor = this._schema.extractor[schema.qualified] = keyPath != null
            ? extractify(keyPath)
            : null
        this._loop.queue.push({ method: 'store', id, name, autoIncrement, keyPath })
        return new DBObjectStore(this, name, this, this._loop, this._schema, id)
    }

    deleteObjectStore (name) {
        const id = this._schema.name[name]
        this._schema.store[id].deleted = true
        delete this._schema.name[name]
        this._loop.queue.push({ method: 'deleteStore', id: id })
    }

    // https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-close
    close () {
        this._transactor.queue.push(null)
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase
