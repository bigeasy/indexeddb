require('proof')(4, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put3')
    await harness(async function () {
        var db, success_event,
          t = async_test(),
          record = { key: 1, property: "data" },
          record_put = { key: 1, property: "changed", more: ["stuff", 2] };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { keyPath: "key" });
            objStore.put(record);

            var rq = objStore.put(record_put);
            rq.onerror = fail(t, "error on put");

            rq.onsuccess = t.step_func(function(e) {
                success_event = true;
            });
        };

        open_rq.onsuccess = function(e) {
            assert_true(success_event);

            var rq = db.transaction("store")
                       .objectStore("store")
                       .get(1);

            rq.onsuccess = t.step_func(function(e) {
                var rec = e.target.result;

                assert_equals(rec.key, record_put.key);
                assert_equals(rec.property, record_put.property);
                assert_array_equals(rec.more, record_put.more);

                t.done();
            });
        };
    })
})
