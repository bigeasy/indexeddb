require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_index')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            db.createObjectStore("store")
              .createIndex("index", "indexedProperty");
        };

        open_rq.onsuccess = function(e) {
            var index = db.transaction("store")
                          .objectStore("store")
                          .index("index");

            assert_true(index instanceof IDBIndex, 'instanceof IDBIndex');
            t.done();
        };

    })
})
