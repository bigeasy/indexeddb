const { DBObjectStore } = require('./store')
const { Queue } = require('avenue')
const { EventTarget, getEventAttributeValue, setEventAttributeValue } = require('event-target-shim')

class DBTransaction extends EventTarget {
    constructor (schema, database, loop, mode) {
        super()
        if (mode == null) {
            throw new Error
        }
        this._schema = schema
        // List of stores created during this transaction if it is a version
        // update transaction.
        this._created = []
        this._database = database
        this._loop = loop
        this._mode = mode
    }

    get onabort () {
        return getEventAttributeValue(this, 'abort')
    }

    set onabort (value) {
        console.log('yes, setting')
        setEventAttributeValue(this, 'abort', value)
    }

    get oncomplete () {
        return getEventAttributeValue(this, 'complete')
    }

    set oncomplete (value) {
        setEventAttributeValue(this, 'complete', value)
    }

    get objectStoreNames () {
    }

    get mode () {
        return this._mode
    }


    get db () {
        return this._database
    }

    get error () {
    }

    objectStore (name) {
        return new DBObjectStore(this, name, this._database, this._loop, this._schema, this._schema.name[name])
    }

    abort () {
        this._aborted = true
        // Mark any stores created by this transaction as deleted, then queue
        // them for actual destruction.
        //
        this._loop.queue.push({ method: 'abort' })
        // **TODO** Can't I track this in the loop.
        for (const id of this._created) {
            this._schema.store[id].deleted = true
            this._loop.queue.push({ method: 'destroy', id: id })
        }
    }
}

exports.DBTransaction = DBTransaction
