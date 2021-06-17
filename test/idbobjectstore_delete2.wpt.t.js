require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_delete2')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var delete_rq = db.createObjectStore("test")
                              .delete(1);

            delete_rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result, undefined);
                t.done();
            });
        };
    })
})
