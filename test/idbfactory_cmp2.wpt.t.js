require('proof')(0, async okay => {
    await require('./harness')(okay, 'idbfactory_cmp2')
    await harness(async function () {
        test( function() {
            assert_throws_js(TypeError, function() {
                indexedDB.cmp();
            });
        }, "IDBFactory.cmp() - no argument");

        test( function() {
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(null, null);
            });
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(1, null);
            });
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(null, 1);
            });
        }, "IDBFactory.cmp() - null");

        test( function() {
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(NaN, NaN);
            });
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(1, NaN);
            });
            assert_throws_dom("DataError", function() {
                indexedDB.cmp(NaN, 1);
            });
        }, "IDBFactory.cmp() - NaN");
    })
})
