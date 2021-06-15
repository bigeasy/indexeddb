require('proof')(6, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore2')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t)

        open_rq.onupgradeneeded = function(e) {
            var db = e.target.result,
                objStore = db.createObjectStore("prop", { keyPath: "mykeypath" })

            assert_equals(objStore.name, "prop", "object store name")
            assert_equals(objStore.keyPath, "mykeypath", "key path")
            assert_equals(objStore.autoIncrement, false, "auto increment")
        }

        open_rq.onsuccess = function(e) {
            var db = e.target.result
            var objStore = db.transaction('prop').objectStore('prop')

            assert_equals(objStore.name, "prop", "object store name")
            assert_equals(objStore.keyPath, "mykeypath", "key path")
            assert_equals(objStore.autoIncrement, false, "auto increment")
            t.done()
        }
    })
})
