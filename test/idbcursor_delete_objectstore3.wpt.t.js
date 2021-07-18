require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbcursor_delete_objectstore3')
    await harness(async function () {

        var db,
          t = async_test(),
          records = [ { pKey: "primaryKey_0", iKey: "indexKey_0" },
                      { pKey: "primaryKey_1", iKey: "indexKey_1" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", { keyPath: "pKey" });

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);

            var cursor_rq = objStore.openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;
                assert_true(cursor instanceof IDBCursor, "cursor exist");
                window.cursor = cursor;
            });

            e.target.transaction.oncomplete = t.step_func(function(e) {
                assert_throws_dom('TransactionInactiveError', function() { window.cursor.delete(); })
                t.done();
            });
        }

    })
})
