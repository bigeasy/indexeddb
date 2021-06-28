require('proof')(5, async okay => {
    await require('./harness')(okay, 'idbindex-getAll-enforcerange')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('store');
            const index = store.createIndex('index', 'keyPath');
          },
          (t, db) => {
            const tx = db.transaction('store');
            const store = tx.objectStore('store');
            const index = store.index('index');
            [NaN, Infinity, -Infinity, -1, -Number.MAX_SAFE_INTEGER].forEach(count => {
              assert_throws_js(TypeError, () => { index.getAll(null, count); },
                               `getAll with count ${count} count should throw TypeError`);
            });
            t.done();
          },
          `IDBIndex.getAll() uses [EnforceRange]`
        );
    })
})
