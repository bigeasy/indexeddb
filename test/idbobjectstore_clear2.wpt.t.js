require('proof')(2, async okay => {
    await require('./harness')(okay, 'idbobjectstore_clear2')
    await harness(async function () {
        var db,
          t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var objStore = db.createObjectStore("store", { autoIncrement: true });
            objStore.createIndex("index", "indexedProperty");

            objStore.add({ indexedProperty: "data" });
            objStore.add({ indexedProperty: "yo, man", something_different: "Yup, totally different" });
            objStore.add({ indexedProperty: 1234 });
            objStore.add({ indexedProperty: [1, 2, 1234] });
            objStore.add(1234);

            objStore.clear().onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result, undefined);
            });
        };

        open_rq.onsuccess = function(e) {
            var rq = db.transaction("store")
                       .objectStore("store")
                       .index("index")
                       .openCursor();

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result, null, 'cursor');
                t.done();
            });
        };
    })
})
