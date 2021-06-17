require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_count4')
    await harness(async function () {
        var db,
            ostore,
            t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function (event) {
            db = event.target.result;
            ostore = db.createObjectStore("store", {keyPath:"pKey"});
            db.deleteObjectStore("store");
            assert_throws_dom("InvalidStateError", function(){
                ostore.count();
            });
            t.done();
        }
    })
})
