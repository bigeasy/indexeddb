require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_put6')
    await harness(async function () {
        var db,
          t = async_test(),
          record = { property: "data" },
          expected_keys = [ 1, 2, 3, 4 ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { keyPath: "key", autoIncrement: true });

            objStore.put(record);
            objStore.put(record);
            objStore.put(record);
            objStore.put(record);
        };

        open_rq.onsuccess = function(e) {
            var actual_keys = [],
              rq = db.transaction("store")
                     .objectStore("store")
                     .openCursor();

            rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;

                if (cursor) {
                    actual_keys.push(cursor.value.key);
                    cursor.continue();
                }
                else {
                    assert_array_equals(actual_keys, expected_keys);
                    t.done();
                }
            });
        };
    })
})
