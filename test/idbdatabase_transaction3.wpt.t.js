require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_transaction3')
    await harness(async function () {
        var db,
          t = async_test(),
          open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            db.createObjectStore('test');
        };

        open_rq.onsuccess = function(e) {
            db.close();

            assert_throws_dom('InvalidStateError',
                function() { db.transaction('test'); });

            t.done();
        };
    })
})
