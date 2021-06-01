require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbtransaction-objectStore-exception-order')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const store = db.createObjectStore('s');
          },
          (t, db) => {
            const tx = db.transaction('s');
            tx.oncomplete = t.step_func(() => {
                assert_throws_dom('InvalidStateError', () => { tx.objectStore('nope'); },
                                  '"finished" check (InvalidStateError) should precede ' +
                                  '"name in scope" check (NotFoundError)');
              t.done();
            });
          },
          'IDBTransaction.objectStore exception order: InvalidStateError vs. NotFoundError'
        );

    })
})
