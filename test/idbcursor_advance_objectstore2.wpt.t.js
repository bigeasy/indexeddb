require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbcursor_advance_objectstore2')
    await harness(async function () {
        var db,
            t = async_test(),
            records = [{ pKey: "primaryKey_0"},
                       { pKey: "primaryKey_1"}];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function (event) {
            db = event.target.result;
            var objStore = db.createObjectStore("store", {keyPath:"pKey"});
            for (var i = 0; i < records.length; i++) {
                objStore.add(records[i]);
            }
        }

        open_rq.onsuccess = function (event) {
            var txn = db.transaction("store", "readwrite");
            var rq = txn.objectStore("store").openCursor();
            rq.onsuccess = t.step_func(function(event) {
                var cursor = event.target.result;
                assert_true(cursor instanceof IDBCursor);

                assert_throws_js(TypeError, function() {
                    cursor.advance(0);
                }, "Calling advance() with count argument 0 should throw TypeError.");

                t.done();
            });
        }
    })
})
