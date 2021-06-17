require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_get6')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            db.createObjectStore("store", { keyPath: "key" })
        }

        open_rq.onsuccess = function (e) {
            var store = db.transaction("store")
                          .objectStore("store");
            store.transaction.abort();
            assert_throws_dom("TransactionInactiveError", function () {
                store.get(1);
            }, "throw TransactionInactiveError on aborted transaction.");
            t.done();
        }
    })
})
