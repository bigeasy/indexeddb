require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_openKeyCursor3')
    await harness(async function () {
        var db,
            t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var store = db.createObjectStore("store", { keyPath: "key" });
            var index = store.createIndex("index", "indexedProperty");
            store.add({ key: 1, indexedProperty: "data" });
        }
        open_rq.onsuccess = function(e) {
            db = e.target.result;
            var tx = db.transaction('store');
            var index = tx.objectStore('store').index('index');
            tx.abort();

            assert_throws_dom("TransactionInactiveError", function(){
                index.openKeyCursor();
            });
            t.done();
        }
    })
})
