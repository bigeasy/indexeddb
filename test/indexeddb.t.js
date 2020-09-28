require('proof')(1, (okay, callback) => {
    const { indexedDB } = require('..')
    okay(indexedDB, 'required')
    const request = indexedDB.open('test', 3)
    request.onupgradeneeded = function () {
        console.log('upgrading')
        return
        const db = request.result
        const store = db.createObjectStore('books', { keyPath: 'isbn' })
        store.createIndex('by_title', 'title', { unique: true })

        store.put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 })
        store.put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 })
        store.put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 })
    }
    request.onsuccess = function () {
        console.log('succeeded')
    }
    callback()
})
