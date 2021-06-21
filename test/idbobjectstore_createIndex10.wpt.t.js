require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex10')
    await harness(async function () {
        var t = async_test(),
            open_rq = createdb(t);

        open_rq.onupgradeneeded = function (e) {
            var db = e.target.result;
            var ostore = db.createObjectStore("store");
            ostore.createIndex("a", "a");
            assert_throws_dom("ConstraintError", function(){
                ostore.createIndex("a", "a");
            });
            t.done();
        }
    })
})
