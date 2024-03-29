require('proof')(10, async okay => {
    await require('./harness')(okay, 'idbcursor_iterating')
    await harness(async function () {
        var db,
          count = 0,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            t.add_cleanup(function() { db.close(); indexedDB.deleteDatabase(db.name); });
            var objStore = db.createObjectStore("test", { keyPath: "key" });

            for (var i = 0; i < 500; i++)
                objStore.add({ key: i, val: "val_"+i });

            var rq = objStore.add({ key: 500, val: "val_500" });

            rq.onsuccess = t.step_func(function() {
                for (var i = 999; i > 500; i--)
                    objStore.add({ key: i, val: "val_"+i });
            });

            objStore.createIndex('index', ['key', 'val']);
        };

        open_rq.onsuccess = function(e) {
            var cursor_rq = db.transaction("test", "readwrite")
                              .objectStore("test")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result,
                  store = e.target.source;
                if (!cursor) {
                    assert_equals(count, 997, "cursor run count");

                    var rq = e.target.source.count();
                    rq.onsuccess = t.step_func(function(e) {
                        assert_equals(e.target.result, 995, "object count");
                        t.done();
                    });
                    return;
                }

                switch (cursor.key) {
                    case 10:
                        assert_equals(count, cursor.key, "count");
                        store.delete(11);
                        break;

                    case 12:
                    case 499:
                    case 500:
                    case 501:
                        assert_equals(count, cursor.key - 1, "count");
                        break;

                    // Delete the next key
                    case 510:
                        store.delete(511);
                        break;

                    // Delete randomly
                    case 512:
                        store.delete(611);
                        store.delete(499);
                        store.delete(500);
                        break;

                    // Delete and add a new key
                    case 520:
                        store.delete(521);
                        store.add({ key: 521, val: "new"});
                        break;

                    case 521:
                        assert_equals(cursor.value.val, "new");
                        break;

                    // We should only be here once although we're basically making the index
                    // "heavier" with its new key.
                    case 530:
                        assert_equals(cursor.value.val, "val_530");
                        cursor.update({ key: 530, val: "val_531" })

                        store.get(530).onsuccess = t.step_func(function(e) {
                            assert_equals(e.target.result.val, "val_531");
                        });
                        break;

                    // Shouldn't happen.
                    case 11:
                    case 511:
                    case 611:
                        assert_unreached(cursor.key + " should be deleted and never run");
                        break;
                }

                cursor.continue();
                count++;
            });
        };
    })
})
