require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_transaction')
    await harness(async function () {

        var db,
          t = async_test(),
          open_rq = createdb(t);

        open_rq.onupgradeneeded = function() {};
        open_rq.onsuccess = function(e) {
            db = e.target.result;

            assert_throws_dom('NotFoundError', function() { db.transaction('non-existing'); });
            t.done();
        };

    })
})
