require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_count2')
    await harness(async function () {
        var db, t = async_test();

        var open_rq = createdb(t);

        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;
            var store = db.createObjectStore("store");

            for(var i = 0; i < 10; i++) {
                store.add({ data: "data" + i }, i);
            }
        }

        open_rq.onsuccess = function(e) {
            var rq = db.transaction("store")
                       .objectStore("store")
                       .count(IDBKeyRange.bound(5,20));

            rq.onsuccess = t.step_func(function(e) {
                assert_equals(e.target.result, 5);
                t.done();
            });
        }
    })
})
