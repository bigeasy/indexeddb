require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_deleteObjectStore2')
    await harness(async function () {

        var t = async_test(),
            open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e)
        {
            var db = e.target.result,
                objStore = db.createObjectStore("delete_outside");

            e.target.transaction.oncomplete = t.step_func(function (e)
            {
                assert_throws_dom('InvalidStateError',
                    function() { db.deleteObjectStore("delete_outside"); });
                t.done();
            });
        }

    })
})
