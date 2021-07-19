require('proof')(4, async okay => {
    await require('./harness')(okay, 'idbcursor_iterating_objectstore2')
    await harness(async function () {
        var db,
          count = 0,
          t = async_test(),
          records = [ { pKey: "primaryKey_0" },
                      { pKey: "primaryKey_2" } ],
          expected_records = [ { pKey: "primaryKey_0" },
                               { pKey: "primaryKey_1" },
                               { pKey: "primaryKey_2" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            t.add_cleanup(function() { db.close(); indexedDB.deleteDatabase(db.name); });
            var objStore = db.createObjectStore("test", {keyPath:"pKey"});

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var cursor_rq = db.transaction("test", "readwrite")
                              .objectStore("test")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;
                if (!cursor) {
                    assert_equals(count, 3, "cursor run count");
                    t.done();
                    return
                }

                var record = cursor.value;
                if (record.pKey == "primaryKey_0") {
                   e.target.source.add({ pKey: "primaryKey_1" });
                }
                assert_equals(record.pKey, expected_records[count].pKey, "primary key");

                cursor.continue();
                count++;
            });
        };
    })
})
