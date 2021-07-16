require('proof')(13, async okay => {
    await require('./harness')(okay, 'idbcursor_continue_index6')
    await harness(async function () {

        var db,
          t = async_test(),
          records = [ { pKey: "primaryKey_0",   iKey: "indexKey_0" },
                      { pKey: "primaryKey_1",   iKey: "indexKey_1" },
                      { pKey: "primaryKey_1-2", iKey: "indexKey_1" },
                      { pKey: "primaryKey_2",   iKey: "indexKey_2" } ],

          expected = [ { pKey: "primaryKey_0",   iKey: "indexKey_0" },
                     { pKey: "primaryKey_1",   iKey: "indexKey_1" },
                     { pKey: "primaryKey_2",   iKey: "indexKey_2" } ];

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("test", { keyPath: "pKey" });

            objStore.createIndex("index", "iKey");

            for (var i = 0; i < records.length; i++)
                objStore.add(records[i]);
        };

        open_rq.onsuccess = function(e) {
            var count = 0,
              cursor_rq = db.transaction("test")
                            .objectStore("test")
                            .index("index")
                            .openCursor(undefined, "nextunique");

            cursor_rq.onsuccess = t.step_func(function(e) {
                if (!e.target.result) {
                    assert_equals(count, expected.length, 'count');
                    t.done();
                    return;
                }
                var cursor = e.target.result,
                  record = cursor.value;

                assert_equals(record.pKey, expected[count].pKey, "pKey #" + count);
                assert_equals(record.iKey, expected[count].iKey, "iKey #" + count);

                assert_equals(cursor.key,  expected[count].iKey, "cursor.key #" + count);
                assert_equals(cursor.primaryKey, expected[count].pKey, "cursor.primaryKey #" + count);

                count++;
                cursor.continue(expected[count] ? expected[count].iKey : undefined);
            });
        };

    })
})
