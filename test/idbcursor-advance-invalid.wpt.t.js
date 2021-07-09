require('proof')(24, async okay => {
    await require('./harness')(okay, 'idbcursor-advance-invalid')
    await harness(async function () {

        function upgrade_func(t, db, tx) {
          var objStore = db.createObjectStore("test");
          objStore.createIndex("index", "");

          objStore.add("data",  1);
          objStore.add("data2", 2);
        }

        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var count = 0;
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              if (!e.target.result) {
                assert_equals(count, 2, 'count');
                t.done();
                return;
              }
              var cursor = e.target.result;

              cursor.advance(1);

              // Second try
              assert_throws_dom('InvalidStateError',
                                function() { cursor.advance(1); }, 'second advance');

              assert_throws_dom('InvalidStateError',
                                function() { cursor.advance(3); }, 'third advance');

              count++;
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - attempt to call advance twice"
        );

        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              var cursor = e.target.result;

              assert_throws_js(TypeError,
                               function() { cursor.advance(document); });

              assert_throws_js(TypeError,
                               function() { cursor.advance({}); });

              assert_throws_js(TypeError,
                               function() { cursor.advance([]); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(""); });

              assert_throws_js(TypeError,
                               function() { cursor.advance("1 2"); });

              t.done();
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - pass something other than number"
        );


        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              var cursor = e.target.result;

              assert_throws_js(TypeError,
                               function() { cursor.advance(null); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(undefined); });

              var myvar = null;
              assert_throws_js(TypeError,
                               function() { cursor.advance(myvar); });

              t.done();
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - pass null/undefined"
        );


        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              var cursor = e.target.result;

              assert_throws_js(TypeError,
                               function() { cursor.advance(); });

              t.done();
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - missing argument"
        );

        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              var cursor = e.target.result;

              assert_throws_js(TypeError,
                               function() { cursor.advance(-1); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(NaN); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(0); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(-0); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(Infinity); });

              assert_throws_js(TypeError,
                               function() { cursor.advance(-Infinity); });

              var myvar = -999999;
              assert_throws_js(TypeError,
                               function() { cursor.advance(myvar); });

              t.done();
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - pass negative numbers"
        );

        indexeddb_test(
          upgrade_func,
          function(t, db) {
            var count = 0;
            var rq = db.transaction("test").objectStore("test").index("index").openCursor();

            rq.onsuccess = t.step_func(function(e) {
              var cursor = e.target.result;
              if (!cursor)
                {
                  assert_equals(count, 2, "count runs");
                  t.done();
                  return;
                }

              assert_throws_js(TypeError,
                               function() { cursor.advance(0); });

              cursor.advance(1);
              count++;
            });
            rq.onerror = t.unreached_func("unexpected error")
          },
          document.title + " - got value not set on exception"
        );

    })
})
