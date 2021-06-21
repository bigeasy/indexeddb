require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbobjectstore_createIndex11')
    await harness(async function () {
        var t = async_test(),
            open_rq = createdb(t);

        open_rq.onupgradeneeded = function (e) {
            var db = e.target.result;
            var ostore = db.createObjectStore("store");
            assert_throws_dom("SyntaxError", function(){
                ostore.createIndex("ab", ".");
            });
            t.done();
        }
    })
})
