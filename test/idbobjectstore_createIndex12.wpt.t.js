require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex12')
    await harness(async function () {
        var db,
            ostore,
            t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function (event) {
            db = event.target.result;
            ostore = db.createObjectStore("store");
            db.deleteObjectStore("store");
        }

        open_rq.onsuccess = function (event) {
            t.step(function(){
                assert_throws_dom("InvalidStateError", function(){
                    ostore.createIndex("index", "indexedProperty");
                });
            });
            t.done();
        }
    })
})
