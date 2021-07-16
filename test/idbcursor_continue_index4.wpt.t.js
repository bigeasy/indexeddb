require('proof')(5, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_index4')
    await harness(async function () {

        var db,
          t = async_test(),
          records = [ { pKey: "primaryKey_0", iKey: "indexKey_0" },
                      { pKey: "primaryKey_1", iKey: "indexKey_1" },
                      { pKey: "primaryKey_2", iKey: "indexKey_2" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", { keyPath: "pKey" });

            objStore.createIndex("index", "iKey");

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var count = 0,
              cursor_rq = db.transaction("test")
                            .objectStore("test")
                            .index("index")
                            .openCursor(undefined, "prev"); // XXX Fx issues w undefined

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result,
                  record = cursor.value;

                switch(count) {
                case 0:
                    assert_equals(record.pKey, records[2].pKey, "first pKey");
                    assert_equals(record.iKey, records[2].iKey, "first iKey");
                    cursor.continue();
                    break;

                case 1:
                    assert_equals(record.pKey, records[1].pKey, "second pKey");
                    assert_equals(record.iKey, records[1].iKey, "second iKey");
                    assert_throws_dom("DataError",
                        function() { cursor.continue("indexKey_2"); });
                    t.done();
                    break;

                default:
                    assert_unreached("Unexpected count value: " + count);
                }

                count++;
            });
        };

    })
})
