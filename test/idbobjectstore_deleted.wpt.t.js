require('proof')(13, async okay => {
    await require('./harness')(okay, 'idbobjectstore_deleted')
    await harness(async function () {
        var db,
          add_success = false,
          t = async_test()

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var objStore = db.createObjectStore("store", { autoIncrement: true });
            assert_equals(db.objectStoreNames[0], "store", "objectStoreNames");

            var rq_add = objStore.add(1);
            rq_add.onsuccess = function() { add_success = true; };
            rq_add.onerror = fail(t, 'rq_add.error');

            objStore.createIndex("idx", "a");
            db.deleteObjectStore("store");
            assert_equals(db.objectStoreNames.length, 0, "objectStoreNames.length after delete");

            const exc = "InvalidStateError"
            assert_throws_dom(exc, function() { objStore.add(2); });
            assert_throws_dom(exc, function() { objStore.put(3); });
            assert_throws_dom(exc, function() { objStore.get(1); });
            assert_throws_dom(exc, function() { objStore.clear(); });
            assert_throws_dom(exc, function() { objStore.count(); });
            assert_throws_dom(exc, function() { objStore.delete(1); });
            assert_throws_dom(exc, function() { objStore.openCursor(); });
            assert_throws_dom(exc, function() { objStore.index("idx"); });
            assert_throws_dom(exc, function() { objStore.deleteIndex("idx"); });
            assert_throws_dom(exc, function() { objStore.createIndex("idx2", "a"); });
        }

        open_rq.onsuccess = function() {
            assert_true(add_success, "First add was successful");
            t.done();
        }
    })
})
