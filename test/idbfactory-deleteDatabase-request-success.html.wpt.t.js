require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbfactory-deleteDatabase-request-success.html')
    await harness(async function () {

        async_test(t => {
          const dbname = document.location + '-' + t.name;
          const rq = indexedDB.deleteDatabase(dbname);
          rq.onerror = t.unreached_func('deleteDatabase should succeed');
          rq.onsuccess = t.step_func(() => {
            assert_equals(
              rq.readyState, 'done',
              'request done flag should be set on success');
            assert_equals(
              rq.result, undefined,
              'request result should still be set to undefined on success');
            assert_equals(
              rq.error, null,
              'request error should be null on success');
            t.done();
          });
        }, 'Properties of IDBOpenDBRequest during IDBFactory deleteDatabase()');

    })
})
