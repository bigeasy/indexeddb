require('proof')(8, async okay => {
    await require('./harness')(okay, 'idbtransaction')
    await harness(async function () {
        async_test(function(t) {
          var dbname = "idbtransaction-" + document.location + t.name;
          indexedDB.deleteDatabase(dbname);
          var open_rq = indexedDB.open(dbname);

          open_rq.onblocked = t.unreached_func('open_rq.onblocked');
          open_rq.onerror = t.unreached_func('open_rq.onerror');

          open_rq.onupgradeneeded = t.step_func(function(e) {
            t.add_cleanup(function() {
              open_rq.onerror = function(e) {
                e.preventDefault();
              };
              open_rq.result.close();
              indexedDB.deleteDatabase(open_rq.result.name);
            });

            assert_equals(e.target, open_rq, "e.target is reusing the same IDBOpenDBRequest");
            assert_equals(e.target.transaction, open_rq.transaction, "IDBOpenDBRequest.transaction");

            assert_true(e.target.transaction instanceof IDBTransaction, "transaction instanceof IDBTransaction");
            t.done();
          });

        }, document.title + " - request gotten by the handler");

        async_test(function(t) {
          var dbname = "idbtransaction-" + document.location + t.name;
          indexedDB.deleteDatabase(dbname);
          var open_rq = indexedDB.open(dbname);

          assert_equals(open_rq.transaction, null, "IDBOpenDBRequest.transaction");
          assert_equals(open_rq.source, null, "IDBOpenDBRequest.source");
          assert_equals(open_rq.readyState, "pending", "IDBOpenDBRequest.readyState");

          assert_true(open_rq instanceof IDBOpenDBRequest, "open_rq instanceof IDBOpenDBRequest");
          assert_equals(open_rq + "", "[object IDBOpenDBRequest]", "IDBOpenDBRequest (open_rq)");

          open_rq.onblocked = t.unreached_func('open_rq.onblocked');
          open_rq.onerror = t.unreached_func('open_rq.onerror');

          open_rq.onupgradeneeded = t.step_func(function() {
            t.add_cleanup(function() {
              open_rq.onerror = function(e) {
                e.preventDefault();
              };
              open_rq.result.close();
              indexedDB.deleteDatabase(open_rq.result.name);
            });
            t.done();
          });

        }, document.title + " - request returned by open()");

    })
})
