require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore7')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t)

        open_rq.onupgradeneeded = function(e) {
            var db = e.target.result
            db.createObjectStore("with unknown param", { parameter: 0 });

            okay('with unknown param')

            t.done()
        }

    })
})
