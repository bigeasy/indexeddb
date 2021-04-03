require('proof')(3, async okay => {
    const futures = await require('./harness')(okay, 'harness.t.js')
    const { Future } = require('perhaps')
    // Open and delete an IndexedDB.
    {
        const request = indexedDB.open('example')
        const future = new Future
        request.onsuccess = function () {
            okay('opened')
            future.resolve()
        }
        await future.promise
    }
    // Create an async test.
    {
        const test = async_test('project-name')
        test.step(function () {
            test.step_func(function () {
                okay('stepped')
                test.done()
            })()
        })
    }
    okay(futures.length != 0, 'has futures')
    for (const future of futures) {
        await future.promise
    }
})
