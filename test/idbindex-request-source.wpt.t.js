require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex-request-source')
    await harness(async function () {

        [
          index => index.get(0),
          index => index.getKey(0),
          index => index.getAll(),
          index => index.getAllKeys(),
          index => index.count(),

          index => index.openCursor(),
          index => index.openKeyCursor()
        ].forEach(func => indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('store', {autoIncrement: true});
            store.createIndex('index', 'kp');
          },
          (t, db) => {
            const tx = db.transaction('store', 'readwrite');
            const index = tx.objectStore('store').index('index');
            assert_equals(func(index).source, index,
                          `${func}.source should be the index itself`);
            t.done();
          },
          `The source of the request from ${func} is the index itself`
        ));

    })
})
