require('proof')(4, async okay => {
    await require('./harness')(okay, 'idbcursor_iterating_index2')
    await harness(async function () {
        var db,
          count = 0,
          t = async_test(),
          records = [ { pKey: "primaryKey_0", obj: { iKey: "iKey_0" }},
                      { pKey: "primaryKey_2", obj: { iKey: "iKey_2" }} ],

          expected = [ [ "primaryKey_2", "iKey_2" ],
                       [ "primaryKey_1", "iKey_1" ],
                       [ "primaryKey_0", "iKey_0" ] ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", {keyPath:"pKey"});
            objStore.createIndex("index", [ "pKey", "obj.iKey" ]);

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var cursor_rq = db.transaction("test", "readwrite")
                              .objectStore("test")
                              .index("index")
                              .openCursor(null, "prev");

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;
                if (!cursor) {
                    assert_equals(count, 3, "cursor run count");
                    t.done();
                    return
                }

                if (count === 0) {
                    e.target.source.objectStore.add({ pKey: "primaryKey_1", obj: { iKey: "iKey_1" } });
                }
                assert_array_equals(cursor.key, expected[count], "primary key");

                cursor.continue();
                count++;
            });
        };
    })
})
