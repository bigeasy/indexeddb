require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbcursor-request-source')
    await harness(async function () {

        [
          cursor => cursor.update(0),
          cursor => cursor.delete()
        ].forEach(func => indexeddb_test(
          (t, db) => {
            db.createObjectStore('store', {autoIncrement: true});
          },
          (t, db) => {
            const tx = db.transaction('store', 'readwrite');
            const store = tx.objectStore('store');
            store.put('value');
            store.openCursor().onsuccess = t.step_func(e => {
              const cursor = e.target.result;
              assert_equals(func(cursor).source, cursor,
                            `${func}.source should be the cursor itself`);
              t.done();
            });
          },
          `The source of the request from ${func} is the cursor itself`
        ));

    })
})
