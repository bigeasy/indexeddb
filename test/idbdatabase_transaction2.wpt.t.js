require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_transaction2')
    await harness(async function () {

        var db,
          t = async_test(),
          open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            db.createObjectStore('readonly');
        };
        open_rq.onsuccess = function(e) {
            var txn = db.transaction('readonly');
            assert_equals(txn.mode, "readonly", 'txn.mode');

            t.done();
        };

    })
})
