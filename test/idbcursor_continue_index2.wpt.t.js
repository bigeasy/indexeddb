require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_index2')
    await harness(async function () {

        var db,
          t = async_test(),
          records = [ { pKey: "primaryKey_0", iKey: "indexKey_0" },
                      { pKey: "primaryKey_1", iKey: "indexKey_1" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", {keyPath:"pKey"});

            objStore.createIndex("index", "iKey");

            for(var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var cursor_rq = db.transaction("test")
                              .objectStore("test")
                              .index("index")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;

                assert_throws_dom("DataError",
                    function() { cursor.continue(document); });

                assert_true(cursor instanceof IDBCursorWithValue, "cursor");

                t.done();
            });
        };

    })
})
