require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_deleteObjectStore3')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e)
        {
            var db = e.target.result;
            assert_throws_dom('NotFoundError',
                function() { db.deleteObjectStore('whatever'); });
            t.done();
        }

    })
})
