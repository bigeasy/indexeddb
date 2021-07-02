require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbindex-objectStore-SameObject')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('store');
            const index = store.createIndex('index', 'keyPath');
            assert_equals(index.objectStore, index.objectStore,
                          'Attribute should yield the same object each time');

          },
          (t, db) => {
            const tx = db.transaction('store');
            const store = tx.objectStore('store');
            const index = store.index('index');
            assert_equals(index.objectStore, index.objectStore,
                          'Attribute should yield the same object each time');
            t.done();
          },
          'IDBIndex.objectStore [SameObject]'
        );
    })
})
