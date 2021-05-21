require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_get2')
    await harness(async function () {
        var db,
          t = async_test(),
          records = [ { key:1, indexedProperty:"data" },
                      { key:2, indexedProperty:"data" },
                      { key:3, indexedProperty:"data" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", { keyPath: "key" });
            objStore.createIndex("index", "indexedProperty");

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var rq = db.transaction("test")
                       .objectStore("test")
                       .index("index")
                       .get("data");

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result.key, records[0].key);
                t.done();
            });
        };
    })
})
