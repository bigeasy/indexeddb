require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbdatabase-deleteObjectStore-exception-order')
    await harness(async function () {

        indexeddb_test(
          (t, db, txn) => {
            db.createObjectStore('s');
            txn.onabort = () => {
              setTimeout(t.step_func(() => {
                assert_throws_dom(
                  'InvalidStateError', () => { db.deleteObjectStore('s'); },
                  '"running an upgrade transaction" check (InvalidStateError) ' +
                  'should precede "not active" check (TransactionInactiveError)');
                t.done();
              }), 0);
            };
            txn.abort();
          },
          (t, db) => { t.assert_unreached('open should fail'); },
          'IDBDatabase.deleteObjectStore exception order: ' +
          'InvalidStateError vs. TransactionInactiveError',
          { upgrade_will_abort: true }
        );

        indexeddb_test(
          (t, db, txn) => {
            txn.abort();
            assert_throws_dom(
              'TransactionInactiveError', () => { db.deleteObjectStore('nope'); },
              '"not active" check (TransactionInactiveError) should precede ' +
              '"name in database" check (NotFoundError)');
            t.done();
          },
          (t, db) => { t.assert_unreached('open should fail'); },
          'IDBDatabase.deleteObjectStore exception order: ' +
          'TransactionInactiveError vs. NotFoundError',
          { upgrade_will_abort: true }
        );

    })
})
