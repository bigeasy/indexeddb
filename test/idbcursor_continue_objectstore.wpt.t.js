require('proof')(5, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_objectstore')
    await harness(async function () {
        var db,
          count = 0,
          t = async_test(),
          records = [ { pKey: "primaryKey_0" },
                      { pKey: "primaryKey_1" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", {autoIncrement:true, keyPath:"pKey"});

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var store = db.transaction("test")
                          .objectStore("test");

            var cursor_rq = store.openCursor();
            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;
                if (!cursor) {
                    assert_equals(count, records.length, "cursor run count");
                    t.done();
                    return
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
