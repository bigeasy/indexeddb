require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_get4')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var rq = db.createObjectStore("store", { keyPath: "key" })
                       .get(1);
            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.results, undefined);
                step_timeout(function() { t.done(); }, 10);
            });
        };

        open_rq.onsuccess = function() {};
    })
})
