require('proof')(6, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore-createIndex-emptyname')
    await harness(async function () {
        var db

        var open_rq = createdb(async_test())
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result
            var store = db.createObjectStore("")

            for (var i = 0; i < 5; i++)
                store.add({ idx: "object_" + i }, i)

            store.createIndex("", "idx")

            store.get(4)
                 .onsuccess = this.step_func(function(e) {
                assert_equals(e.target.result.idx, 'object_4', 'result')
            })
            assert_equals(store.indexNames[0], "", "indexNames[0]")
            assert_equals(store.indexNames.length, 1, "indexNames.length")
        }

        open_rq.onsuccess = function() {
            var store = db.transaction("").objectStore("")

            assert_equals(store.indexNames[0], "", "indexNames[0]")
            assert_equals(store.indexNames.length, 1, "indexNames.length")

            store.index("")
                 .get('object_4')
                 .onsuccess = this.step_func(function(e) {
                assert_equals(e.target.result.idx, 'object_4', 'result')
                this.done()
            })
        }
    })
})
