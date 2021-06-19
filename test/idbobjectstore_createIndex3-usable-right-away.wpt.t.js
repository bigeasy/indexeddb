require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex3-usable-right-away')
    await harness(async function () {
        var db, aborted,
          t = async_test()

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var txn = e.target.transaction,
              objStore = db.createObjectStore("store", { keyPath: 'key' });

            for (var i = 0; i < 100; i++)
                objStore.add({ key: "key_" + i, indexedProperty: "indexed_" + i });

            var idx = objStore.createIndex("index", "indexedProperty")

            idx.get('indexed_99').onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result.key, 'key_99', 'key');
            });
            idx.get('indexed_9').onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result.key, 'key_9', 'key');
            });
        }

        open_rq.onsuccess = function() {
            t.done();
        }
    })
})
