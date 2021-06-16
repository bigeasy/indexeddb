require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_deleteObjectStore')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t)

        open_rq.onupgradeneeded = function(e) {
            var db = e.target.result

            db.createObjectStore("deleted");
            db.deleteObjectStore("deleted");
            assert_false(db.objectStoreNames.contains("deleted"))

            t.done()
        }

    })
})
