require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t)

        open_rq.onupgradeneeded = function(e) {
            var db = e.target.result
            var objStore = db.createObjectStore('instancetest')

            assert_true(objStore instanceof IDBObjectStore, 'instanceof IDBObjectStore')
        }

        open_rq.onsuccess = function(e) {
            var db = e.target.result
            var objStore = db.transaction('instancetest').objectStore('instancetest')

            assert_true(objStore instanceof IDBObjectStore, 'instanceof IDBObjectStore')
            t.done()
        }
    })
})
