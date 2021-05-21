require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put14')
    await harness(async function () {
        var db,
          t = async_test(),
          record = { key: 1, indexedProperty: { property: "data" } };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var rq,
              objStore = db.createObjectStore("store", { keyPath: "key" });

            objStore.createIndex("index", "indexedProperty");

            rq = objStore.put(record);

            assert_true(rq instanceof IDBRequest);
            rq.onsuccess = function() {
                t.done();
            }
        };
    })
})
