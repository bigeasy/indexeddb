require('proof')(5, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_invalid')
    await harness(async function () {

        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test");

            objStore.createIndex("index", "");

            objStore.add("data",  1);
            objStore.add("data2", 2);
        };

        open_rq.onsuccess = function(e) {
            var count = 0;
            var cursor_rq = db.transaction("test")
                              .objectStore("test")
                              .index("index")
                              .openCursor();

            cursor_rq.onsuccess = t.step_func(function(e) {
                if (!e.target.result) {
                    assert_equals(count, 2, 'count');
                    t.done();
                    return;
                }
                var cursor = e.target.result;

                cursor.continue(undefined);

                // Second try
                assert_throws_dom('InvalidStateError',
                    function() { cursor.continue(); }, 'second continue');

                assert_throws_dom('InvalidStateError',
                    function() { cursor.continue(3); }, 'third continue');

                count++;
            });
        };

    })
})
