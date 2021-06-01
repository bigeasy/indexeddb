require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbtransaction-db-SameObject')
    await harness(async function () {

        indexeddb_test(
          (t, db, tx) => {
            const store = db.createObjectStore('store');
            assert_equals(tx.db, tx.db,
                          'Attribute should yield the same object each time');
          },
          (t, db) => {
            const tx = db.transaction('store');
            assert_equals(tx.db, tx.db,
                          'Attribute should yield the same object each time');
            t.done();
          },
          'IDBTransaction.db [SameObject]'
        );
    })
})
