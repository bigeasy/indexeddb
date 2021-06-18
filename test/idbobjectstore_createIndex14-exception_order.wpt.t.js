require('proof')(6, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex14-exception_order')
    await harness(async function () {

        indexeddb_test(
            function(t, db, txn) {
                var store = db.createObjectStore("s");
            },
            function(t, db) {
                var txn = db.transaction("s");
                var store = txn.objectStore("s");
                txn.oncomplete = function() {
                    assert_throws_dom("InvalidStateError", function() {
                        store.createIndex("index", "foo");
                    }, "Mode check should precede state check of the transaction");
                    t.done();
                };
            },
            "InvalidStateError(Incorrect mode) vs. TransactionInactiveError"
        );

        var gDeletedObjectStore;
        indexeddb_test(
            function(t, db, txn) {
                gDeletedObjectStore = db.createObjectStore("s");
                db.deleteObjectStore("s");
                txn.oncomplete = function() {
                    assert_throws_dom("InvalidStateError", function() {
                        gDeletedObjectStore.createIndex("index", "foo");
                    }, "Deletion check should precede transaction-state check");
                    t.done();
                };
            },
            null,
            "InvalidStateError(Deleted ObjectStore) vs. TransactionInactiveError"
        );

        indexeddb_test(
            function(t, db, txn) {
                var store = db.createObjectStore("s");
                store.createIndex("index", "foo");
                txn.oncomplete = function() {
                    assert_throws_dom("TransactionInactiveError", function() {
                        store.createIndex("index", "foo");
                    }, "Transaction-state check should precede index name check");
                    t.done();
                };
            },
            null,
            "TransactionInactiveError vs. ConstraintError"
        );

        indexeddb_test(
            function(t, db) {
                var store = db.createObjectStore("s");
                store.createIndex("index", "foo");
                assert_throws_dom("ConstraintError", function() {
                    store.createIndex("index", "invalid key path");
                }, "Index name check should precede syntax check of the key path");
                assert_throws_dom("ConstraintError", function() {
                    store.createIndex("index",
                                      ["invalid key path 1", "invalid key path 2"]);
                }, "Index name check should precede syntax check of the key path");
                t.done();
            },
            null,
            "ConstraintError vs. SyntaxError"
        );

        indexeddb_test(
            function(t, db) {
                var store = db.createObjectStore("s");
                assert_throws_dom("SyntaxError", function() {
                    store.createIndex("index",
                                      ["invalid key path 1", "invalid key path 2"],
                                      { multiEntry: true });
                }, "Syntax check should precede multiEntry check of the key path");
                t.done();
            },
            null,
            "SyntaxError vs. InvalidAccessError"
        );

    })
})
