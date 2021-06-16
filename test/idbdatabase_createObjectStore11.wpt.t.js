require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbdatabase_createObjectStore11')
    await harness(async function () {
        var t = async_test(),
            open_rq = createdb(t);

        open_rq.onupgradeneeded = function (e) {
            var db = e.target.result;
            db.createObjectStore("store");
            assert_throws_dom("ConstraintError", function(){
                db.createObjectStore("store", {
                    keyPath: "key1",
                });
            });
            t.done();
        }
    })
})
