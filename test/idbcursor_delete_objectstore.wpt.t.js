require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbcursor_delete_objectstore')
    await harness(async function () {

        var db,
          count = 0,
          t = async_test(),
          records = [ { pKey: "primaryKey_0" },
                      { pKey: "primaryKey_1" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var objStore = db.createObjectStore("test", { keyPath: "pKey" });

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = t.step_func(CursorDeleteRecord);


        function CursorDeleteRecord(e) {
            var txn = db.transaction("test", "readwrite"),
              cursor_rq = txn.objectStore("test").openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;

                assert_true(cursor != null, "cursor exist");
                cursor.delete();
            });

            txn.oncomplete = t.step_func(VerifyRecordWasDeleted);
        }


        function VerifyRecordWasDeleted(e) {
            var cursor_rq = db.transaction("test")
                              .objectStore("test")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;

                if (!cursor) {
                    assert_equals(count, 1, 'count');
                    t.done();
                    return
                }

                assert_equals(cursor.value.pKey, records[1].pKey);
                count++;
                cursor.continue();
            });
        }

    })
})
