require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore-transaction-SameObject')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('store');
            assert_equals(store.transaction, store.transaction,
                          'Attribute should yield the same object each time');

          },
          (t, db) => {
            const tx = db.transaction('store');
            const store = tx.objectStore('store');
            assert_equals(store.transaction, store.transaction,
                          'Attribute should yield the same object each time');
            t.done();
          },
          'IDBObjectStore.transaction [SameObject]'
        );
    })
})
