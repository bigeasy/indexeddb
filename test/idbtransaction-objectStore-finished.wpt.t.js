require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbtransaction-objectStore-finished')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            db.createObjectStore('store');
          },
          (t, db) => {
            const tx = db.transaction('store');
            tx.abort();
            assert_throws_dom('InvalidStateError', () => tx.objectStore('store'),
                              'objectStore() should throw if transaction is finished');
            t.done();
          },
          'IDBTransaction objectStore() behavior when transaction is finished'
        );

    })
})
