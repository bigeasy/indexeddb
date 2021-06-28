require('proof')(1003, async okay => {
    await require('./harness')(okay, 'idbindex-multientry-big')
    await harness(async function () {
        var db,
            t_add = async_test("Adding one item with 1000 multiEntry keys"),
            t_get = async_test("Getting the one item by 1000 indeced keys ");

        var open_rq = createdb(t_add);
        var obj = { test: 'yo', idxkeys: [] };

        for (var i = 0; i < 1000; i++)
            obj.idxkeys.push('index_no_' + i);


        open_rq.onupgradeneeded = function(e) {
            db = e.target.result;

            db.createObjectStore('store')
              .createIndex('index', 'idxkeys', { multiEntry: true });
        };
        open_rq.onsuccess = function(e) {
            var tx = db.transaction('store', 'readwrite');
            tx.objectStore('store')
              .put(obj, 1)
              .onsuccess = t_add.step_func(function(e)
            {
                assert_equals(e.target.result, 1, "put'd key");
                this.done();
            });

            tx.oncomplete = t_get.step_func(function() {
                var idx = db.transaction('store').objectStore('store').index('index')

                for (var i = 0; i < 1000; i++)
                {
                    idx.get('index_no_' + i).onsuccess = t_get.step_func(function(e) {
                        assert_equals(e.target.result.test, "yo");
                    });
                }

                idx.get('index_no_999').onsuccess = t_get.step_func(function(e) {
                    assert_equals(e.target.result.test, "yo");
                    assert_equals(e.target.result.idxkeys.length, 1000);
                    this.done();
                });
            });
        };
    })
})
