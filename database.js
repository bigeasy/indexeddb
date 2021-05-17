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
        return new DBTransaction(this._schema, this._database, loop)
    }

    createObjectStore (name, { autoIncrement = false, keyPath = null } = {}) {
        // **TODO** Assert we do not have a transaction error.
        if (name === undefined) {
            throw new TypeError
        }
        this._schema[name] = {
            properties: {
                name: `store.${name}`, keyPath, autoIncrement: autoIncrement ? 0 : null,
                indices: {}
            },
            extractor: keyPath == null ? null : extractify(keyPath),
            extractors: {}
        }
        this._loop.queue.push({ method: 'store', name, autoIncrement, keyPath })
        return new DBObjectStore(name, this, this._loop, this._schema[name])
    }

    deleteObjectStore (name) {
        throw new Error
    }

    // https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-close
    close () {
        this._transactor.queue.push(null)
    }

    // **TODO** `onabort`, `onclose`, `onerror`, `onversionchange`.
}

exports.DBDatabase = DBDatabase
