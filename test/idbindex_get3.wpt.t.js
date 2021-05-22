require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_get3')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var rq = db.createObjectStore("test", { keyPath: "key" })
                       .createIndex("index", "indexedProperty")
                       .get(1);

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result, undefined);
                t.done();
            });
        };
    })
})
