require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbtransaction_abort')
    await harness(async function () {
        var db, aborted,
          t = async_test(),
          record = { indexedProperty: "bar" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var txn = e.target.transaction,
              objStore = db.createObjectStore("store");

            objStore.add(record, 1);
            objStore.add(record, 2);
            var index = objStore.createIndex("index", "indexedProperty", { unique: true });

            assert_true(index instanceof IDBIndex, "IDBIndex");

            e.target.transaction.onabort = t.step_func(function(e) {
                aborted = true;
                assert_equals(e.type, "abort", "event type");
            });

            db.onabort = function(e) {
                assert_true(aborted, "transaction.abort event has fired");
                t.done();
            };

            e.target.transaction.oncomplete = fail(t, "got complete, expected abort");
        };

    })
})
