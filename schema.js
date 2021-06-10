const assert = require('assert')

const { extractify } = require('./extractor')

class Schema {
    static root (max) {
        return {
            store: {},
            name: {},
            max: max,
            extractor: {}
        }
    }

    constructor (root) {
        // TODO Expose `root`.
        this._root = root
        this.reset()
    }

    createObjectStore (name, keyPath, autoIncrement) {
        const id = ++this._root.max
        this._added.add(id)
        assert(typeof keyPath == 'string' || keyPath == null)
        const store = this._pending.store[id] = {
            type: 'store',
            id: id,
            name: name,
            qualified: `store.${id}`,
            keyPath: keyPath,
            autoIncrement: autoIncrement ? 1 : null,
            index: {}
        }
        this._pending.name[name] = id
        this._pending.extractor[id] = keyPath != null
            ? extractify(keyPath)
            : null
        return store
    }

    deleteObjectStore (name) {
        const store = this.getObjectStore(name)
        delete this._pending.name[name]
        this._deleted.store.add(store.id)
    }

    isDeleted (store) {
        assert(typeof store == 'object')
        if (store.rolledback) {
            return true
        }
        if (store.type == 'index') {
            return this._deleted.index.has(store.id) ||
                this._deleted.store.has(store.storeId)
        }
        return this._deleted.store.has(store.id)
    }

    getObjectStore (name) {
        const storeId = this._pending.name[name]
        if (storeId == null) {
            return null
        }
        return this._pending.store[storeId]
    }

    getObjectStoreNames () {
        return Object.keys(this._pending.name)
    }

    createIndex (storeName, indexName, keyPath, multiEntry, unique) {
        const store = this.getObjectStore(storeName)
        const indexId = ++this._root.max
        this._added.add(indexId)
        const index = this._pending.store[indexId] = {
            type: 'index',
            id: indexId,
            storeId: store.id,
            name: indexName,
            qualified: `index.${indexId}`,
            keyPath: keyPath,
            multiEntry: multiEntry,
            unique: unique
        }
        store.index[indexName] = indexId
        this._pending.extractor[indexId] = extractify(keyPath)
        return index
    }

    deleteIndex (storeName, indexName) {
        const store = this.getObjectStore(storeName)
        this._deleted.index.add(store.index[indexName])
        delete store.index[indexName]
    }

    getIndex (storeName, indexName) {
        const store = this.getObjectStore(storeName)
        if (store == null) {
            return null
        }
        const id = store.index[indexName]
        if (id == null) {
            return null
        }
        return this._pending.store[id] || this._copy.store[id]
    }

    getIndexNames (storeName) {
        const store = this.getObjectStore(storeName)
        return store ? Object.keys(store.index).sort() : []
    }

    getExtractor (id) {
        return this._pending.extractor[id] || this._root.extractor[id] || null
    }

    merge () {
        for (const id of this._deleted.index) {
            delete this._root.store[id]
            delete this._pending.store[id]
        }
        for (const id of this._deleted.store) {
            const store = this._pending.store[id] || this._copy.store[id]
            delete this._root.name[store.name]
            delete this._root.store[id]
            delete this._pending.store[id]
        }
        for (const name in this._pending.name) {
            this._root.name[name] = this._pending.name[name]
        }
        for (const id in this._pending.store) {
            this._root.store[id] = this._pending.store[id]
        }
        for (const id in this._pending.extractor) {
            this._root.extractor[id] = this._pending.extractor[id]
        }
        this.reset()
    }

    abort () {
        console.log('rollback')
        for (const id of this._added) {
            console.log('rollback', id)
            this._pending.store[id].rolledback = true
        }
        this.reset()
    }

    reset () {
        this._pending = {
            name: JSON.parse(JSON.stringify(this._root.name)),
            store: JSON.parse(JSON.stringify(this._root.store)),
            extractor: {}
        }
        this._added = new Set
        this._deleted = { index: new Set, store: new Set }
    }
}

module.exports = Schema
