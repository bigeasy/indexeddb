require('proof')(5, async okay => {
    await require('./harness')(okay, 'idbobjectstore-getAll-enforcerange')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('store');
          },
          (t, db) => {
            const tx = db.transaction('store');
            const store = tx.objectStore('store');
            [NaN, Infinity, -Infinity, -1, -Number.MAX_SAFE_INTEGER].forEach(count => {
              assert_throws_js(TypeError, () => { store.getAll(null, count); },
                               `getAll with count ${count} count should throw TypeError`);
            });
            t.done();
          },
          `IDBObjectStore.getAll() uses [EnforceRange]`
        );
    })
})
