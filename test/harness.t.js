require('proof')(3, async okay => {
    await require('./harness')(okay, 'harness.t.js')
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
        await harness(async function () {
            const test = async_test('project-name')
            test.step(function () {
                test.step_func(function () {
                    okay('stepped')
                    test.done()
                })()
            })
        })
    }
    // Test cleanup.
    {
        await harness(async function () {
            add_completion_callback(function () {
                okay('janitor')
            })
        })
    }
    // Open and close a database from IndexedDB test harness.
    {
        await harness(async function () {
            const test = async_test('createdb')
            createdb(test).onupgradeneeded = function (event) {
                console.log('did call', arguments)
                event.target.onsuccess = test.step_func(function (event) {
                    test.done()
                })
            }
        })
    }
})
