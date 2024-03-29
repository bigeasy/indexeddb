require('proof')(4, async okay => {
    await require('./harness')(okay, 'idbcursor-update-exception-order')
    await harness(async function () {

        indexeddb_test(
          (t, db) => {
            const s = db.createObjectStore('s');
            s.put('value', 'key');
          },
          (t, db) => {
            const s = db.transaction('s', 'readonly').objectStore('s');
            const r = s.openCursor();
            r.onsuccess = t.step_func(() => {
              r.onsuccess = null;
              const cursor = r.result;
              setTimeout(t.step_func(() => {
                assert_throws_dom('TransactionInactiveError', () => {
                  cursor.update('value2');
                }, '"Transaction inactive" check (TransactionInactiveError) ' +
                   'should precede "read only" check (ReadOnlyError)');
                t.done();
              }), 0);
            });
          },
          'IDBCursor.update exception order: TransactionInactiveError vs. ReadOnlyError'
        );

        indexeddb_test(
          (t, db) => {
            const s = db.createObjectStore('s');
            s.put('value', 'key');
          },
          (t, db) => {
            const s = db.transaction('s', 'readonly').objectStore('s');
            const r = s.openCursor();
            r.onsuccess = t.step_func(() => {
              r.onsuccess = null;
              const cursor = r.result;
              cursor.continue();
              assert_throws_dom('ReadOnlyError', () => {
                cursor.update('value2');
              }, '"Read only" check (ReadOnlyError) should precede '+
                 '"got value flag" check (InvalidStateError)');
              t.done();
            });
          },
          'IDBCursor.update exception order: ReadOnlyError vs. InvalidStateError #1'
        );

        indexeddb_test(
          (t, db) => {
            const s = db.createObjectStore('s');
            s.put('value', 'key');
          },
          (t, db) => {
            const s = db.transaction('s', 'readonly').objectStore('s');
            const r = s.openKeyCursor();
            r.onsuccess = t.step_func(() => {
              r.onsuccess = null;
              const cursor = r.result;
              assert_throws_dom('ReadOnlyError', () => {
                cursor.update('value2');
              }, '"Read only" check (ReadOnlyError) should precede '+
                 '"key only flag" check (InvalidStateError)');
              t.done();
            });
          },
          'IDBCursor.update exception order: ReadOnlyError vs. InvalidStateError #2'
        );

        indexeddb_test(
          (t, db) => {
            const s = db.createObjectStore('s', {keyPath: 'id'});
            s.put({id: 123, data: 'value'});
          },
          (t, db) => {
            const s = db.transaction('s', 'readwrite').objectStore('s');
            const r = s.openCursor();
            r.onsuccess = t.step_func(() => {
              r.onsuccess = null;
              const cursor = r.result;
              cursor.continue();
              assert_throws_dom('InvalidStateError', () => {
                cursor.update({id: 123, data: 'value2'});
              }, '"Got value flag" check (InvalidStateError) should precede ' +
                 '"modified key" check (DataError)');
              t.done();
            });
          },
          'IDBCursor.update exception order: InvalidStateError vs. DataError'
        );

    })
})
