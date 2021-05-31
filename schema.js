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
        this._root = root
        this._copy = {
            name: JSON.parse(JSON.stringify(this._root.name)),
            store: JSON.parse(JSON.stringify(this._root.store))
        }
        this._pending = Schema.root(0)
    }

    createObjectStore (name, keyPath, autoIncrement) {
        const id = ++this._root.max
        const schema = this._pending.store[id] = {
            type: 'store',
            id: id,
            name: name,
            qualified: `store.${id}`,
            keyPath: keyPath,
            autoIncrement: autoIncrement ? 0 : null,
            index: {}
        }
        this._pending.name[name] = id
        this._pending.extractor[id] = keyPath != null
            ? extractify(keyPath)
            : null
        return id
    }

    getObjectStore (name) {
        const id = this._pending.name[name] || this._copy.name[name]
        if (id == null) {
            return null
        }
        return this._pending.store[id] || this._copy.store[id]
    }

    createIndex (storeName, indexName, keyPath, multiEntry, unique) {
        const storeId = this._pending.name[storeName] || this._copy.name[storeName]
        if (storeId in this._copy.store) {
            if (! (storeId in this._pending.store)) {
                this._pending.store[storeId] = JSON.parse(JSON.stringify(this._copy.store[storeId]))
            }
        } else {
            assert(storeId in this._pending.store)
        }
        const store = this._pending.store[storeId]
        const indexId = ++this._root.max
        const index = this._pending.store[indexId] = {
            type: 'index',
            id: indexId,
            storeId: storeId,
            name: indexName,
            qualified: `index.${indexId}`,
            keyPath: keyPath,
            multiEntry: multiEntry,
            unique: unique
        }
        store.index[indexName] = indexId
        this._pending.extractor[indexId] = extractify(keyPath)
        return indexId
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

    getExtractor (id) {
        return this._pending.extractor[id] || this._root.extractor[id] || null
    }

    merge () {
        for (const name in this._pending.name) {
            this._root.name[name] = this._pending.name[name]
        }
        for (const id in this._pending.store) {
            this._root.store[id] = this._pending.store[id]
        }
        for (const id in this._pending.extractor) {
            this._root.extractor[id] = this._pending.extractor[id]
        }
    }
}

module.exports = Schema
