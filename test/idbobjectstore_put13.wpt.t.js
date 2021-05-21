require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put13')
    await harness(async function () {
        var db,
          t = async_test(),
          record = { property: "data" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var rq,
              objStore = db.createObjectStore("store");

            assert_throws_dom("DataError",
                function() { rq = objStore.put(record, { value: 1 }); });

            assert_equals(rq, undefined);
            t.done();
        };
    })
})
