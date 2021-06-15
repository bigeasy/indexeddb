require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore3')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t)

        open_rq.onupgradeneeded = function() {}
        open_rq.onsuccess = function (e) {
            var db = e.target.result
            assert_throws_dom(
                'InvalidStateError',
                function() { db.createObjectStore('fails') })
            t.done();
        }

    })
})
