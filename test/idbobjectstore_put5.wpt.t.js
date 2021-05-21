require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put5')
    await harness(async function () {
        var db,
          t = async_test(),
          record = { test: { obj: { key: 1 } }, property: "data" };

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { keyPath: "test.obj.key" });
            objStore.put(record);
        };

        open_rq.onsuccess = function(e) {
            var rq = db.transaction("store")
                       .objectStore("store")
                       .get(record.test.obj.key);

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result.property, record.property);

                t.done();
            });
        };
    })
})
