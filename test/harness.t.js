require('proof')(0, async okay => {
    await require('./harness')(okay, 'harness.t.js')
    const { Future } = require('perhaps')
    // Open and delete an IndexedDB.
    {
        const request = indexedDB.open('example')
        const future = new Future
        request.onsuccess = function () {
            okay('called')
            okay.inc(1)
            future.resolve()
        }
        await future.promise
    }
})
