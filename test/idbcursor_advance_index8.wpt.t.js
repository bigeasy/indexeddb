require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbcursor_advance_index8')
    await harness(async function () {
        var db,
            t = async_test(),
            records = [{ pKey: "primaryKey_0", iKey: "indexKey_0" },
                       { pKey: "primaryKey_1", iKey: "indexKey_1" }];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function (event) {
            db = event.target.result;
            var objStore = db.createObjectStore("store", {keyPath : "pKey"});
            objStore.createIndex("index", "iKey");
            for (var i = 0; i < records.length; i++) {
                objStore.add(records[i]);
            }
            var rq = objStore.index("index").openCursor();
            rq.onsuccess = t.step_func(function(event) {
                var cursor = event.target.result;
                assert_true(cursor instanceof IDBCursor);

                cursor.advance(1);
                assert_throws_dom("InvalidStateError", function() {
                    cursor.advance(1);
                }, "Calling advance() should throw DOMException when the cursor is currently being iterated.");

                t.done();
            });
        }
    })
})
