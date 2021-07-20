require('proof')(1, async okay => {
    await require('./harness')(okay, 'objectstore_keyorder')
    await harness(async function () {
        var db,
          d = new Date(),
          t = async_test(),
          records = [ { key: d },
                      { key: "test" },
                      { key: 1 },
                      { key: 2.55 }  ],
          expectedKeyOrder = [ 1, 2.55, d.valueOf(), "test" ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { keyPath: "key" });

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var actual_keys = [],
              rq = db.transaction("store")
                     .objectStore("store")
                     .openCursor();

            rq.onsuccess = t.step_func(function(e) {
                var cursor = e.target.result;

                if (cursor) {
                    actual_keys.push(cursor.key.valueOf());
                    cursor.continue();
                }
                else {
                    assert_array_equals(actual_keys, expectedKeyOrder);
                    t.done();
                }
            });
        };
    })
})
