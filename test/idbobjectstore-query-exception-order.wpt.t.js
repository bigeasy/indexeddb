require('proof')(12, async okay => {
    await require('./harness')(okay, 'idbobjectstore-query-exception-order')
    await harness(async function () {

        ['get',
         'getAll',
         'getAllKeys',
         'count',
         'openCursor',
         'openKeyCursor'
        ].forEach(method => {

          indexeddb_test(
            (t, db) => {
              const store = db.createObjectStore('s');
              const store2 = db.createObjectStore('s2');

              db.deleteObjectStore('s2');

              setTimeout(t.step_func(() => {
                assert_throws_dom(
                  'InvalidStateError', () => { store2[method]('key'); },
                  '"has been deleted" check (InvalidStateError) should precede ' +
                  '"not active" check (TransactionInactiveError)');

                t.done();
              }), 0);
            },
            (t, db) => {},
            `IDBObjectStore.${method} exception order: ` +
            'InvalidStateError vs. TransactionInactiveError'
          );

          indexeddb_test(
            (t, db) => {
              const store = db.createObjectStore('s');
            },
            (t, db) => {
              const tx = db.transaction('s');
              const store = tx.objectStore('s');

              setTimeout(t.step_func(() => {
                assert_throws_dom(
                  'TransactionInactiveError', () => { store[method]({}); },
                  '"not active" check (TransactionInactiveError) should precede ' +
                  'query check (DataError)');
                t.done();
              }), 0);
            },
            `IDBObjectStore.${method} exception order: ` +
            'TransactionInactiveError vs. DataError'
          );
        });

    })
})
