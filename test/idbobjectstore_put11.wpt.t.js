require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put11')
    await harness(async function () {
        var db,
          t = async_test(),
          record = { key: { value: 1 }, property: "data" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var rq,
              objStore = db.createObjectStore("store", { keyPath: "key" });

            assert_throws_dom("DataError",
                function() { rq = objStore.put(record); });

            assert_equals(rq, undefined);
            t.done();
        };
    })
})
