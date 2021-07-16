require('proof')(7, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_index')
    await harness(async function () {
        var db,
          count = 0,
          t = async_test(),
          records = [ { pKey: "primaryKey_0",   iKey: "indexKey_0" },
                      { pKey: "primaryKey_1",   iKey: "indexKey_1" },
                      { pKey: "primaryKey_1-2", iKey: "indexKey_1" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", { keyPath:"pKey" });

            objStore.createIndex("index", "iKey");

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var cursor_rq = db.transaction("test")
                              .objectStore("test")
                              .index("index")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;
                if (!cursor) {
                    assert_equals(count, records.length, "cursor run count");
                    t.done();
                    return  // Yes, execeptions throw below but the harness
                            //ignores them.
                }

                var record = cursor.value;
                assert_equals(record.pKey, records[count].pKey, "primary key");
                assert_equals(record.iKey, records[count].iKey, "index key");

                cursor.continue();
                count++;
            });
        };
    })
})
