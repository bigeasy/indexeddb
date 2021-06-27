require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_count4')
    await harness(async function () {
        var db, t = async_test();

        var open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var store = db.createObjectStore("store", { autoIncrement: true });
            store.createIndex("index", "indexedProperty");

            for(var i = 0; i < 10; i++) {
                store.add({ indexedProperty: "data" + i });
            }
        }

        open_rq.onsuccess = function(e) {
            var index = db.transaction("store")
                          .objectStore("store")
                          .index("index");

            assert_throws_dom("DataError", function() {
                index.count(NaN);
            });

            t.done();
        }
    })
})
