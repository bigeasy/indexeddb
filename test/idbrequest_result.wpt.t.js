require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbrequest_result')
    await harness(async function () {
        async_test(t => {
          var open = createdb(t);
          open.onupgradeneeded = t.step_func(e => {
            var db = e.target.result;
            db.createObjectStore('store');
          });
          open.onsuccess = t.step_func(e => {
            var db = e.target.result;
            var request = db.transaction('store').objectStore('store').get(0);

            assert_equals(request.readyState, 'pending');
            assert_throws_dom('InvalidStateError', () => request.result,
                              'IDBRequest.result should throw if request is pending');
            t.done();
          });
        }, 'IDBRequest.result throws if ready state is pending');
    })
})
