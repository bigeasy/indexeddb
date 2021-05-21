require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put9')
    await harness(async function () {
        var t = async_test(),
          record = { key: 1, property: "data" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            var rq,
              db = e.target.result,
              objStore = db.createObjectStore("store", { keyPath: "key" });

            assert_throws_dom("DataError",
                function() { rq = objStore.put(record, 1); });

            assert_equals(rq, undefined);
            t.done();
        };
    })
})
