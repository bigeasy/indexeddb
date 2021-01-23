require('proof')(1, async okay => {
    const future = require('perhaps')

    const fs = require('fs').promises
    const path = require('path')

    const directory = path.join(__dirname, 'tmp', 'indexeddb')

    await fs.rmdir(directory, { recursive: true })
    await fs.mkdir(directory, { recursive: true })

    const indexedDB = require('..').create({ directory })

    okay(indexedDB, 'required')

    const request = indexedDB.open('test', 3)

    request.onupgradeneeded = function () {
        okay(request.readyState, 'done', 'on upgrade done')
        console.log('upgrading')
        const db = request.result
        const store = db.createObjectStore('books', { keyPath: 'isbn' })
        return
        // store.createIndex('by_title', 'title', { unique: true })

        store.put({ title: 'Quarry Memories', author: 'Fred', isbn: 123456 })
        store.put({ title: 'Water Buffaloes', author: 'Fred', isbn: 234567 })
        store.put({ title: 'Bedrock Nights', author: 'Barney', isbn: 345678 })
    }
    request.onsuccess = function () {
        console.log('succeeded')
        future.resolve()
    }
    await future.promise
})
