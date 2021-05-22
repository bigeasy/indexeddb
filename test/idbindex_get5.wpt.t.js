require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex_get5')
    await harness(async function () {
        var db,
            t = async_test();

        var open_rq = createdb(t);
        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            var index = db.createObjectStore("test", { keyPath: "key" })
                          .createIndex("index", "indexedProperty");
            assert_throws_dom("DataError",function(){
                index.get(NaN);
            });
            t.done();
        };
    })
})
