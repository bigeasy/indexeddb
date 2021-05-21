require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_get')
    await harness(async function () {
        var db, index,
          t = async_test(),
          record = { key: 1, indexedProperty: "data" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { keyPath: "key" });
            index = objStore.createIndex("index", "indexedProperty");

            objStore.add(record);
        }

        open_rq.onsuccess = function(e) {
            var rq = db.transaction("store")
                       .objectStore("store")
                       .index("index")
                       .get(record.indexedProperty);

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result.key, record.key);
                t.done();
            });
        }
    })
})
