require('proof')(3, async okay => {
    await require('./harness')(okay, 'idbfactory_cmp')
    await harness(async function () {
        test(function() {
            var greater = window.indexedDB.cmp(2, 1);
            var equal = window.indexedDB.cmp(2, 2);
            var less = window.indexedDB.cmp(1, 2);

            assert_equals(greater, 1, "greater");
            assert_equals(equal, 0, "equal");
            assert_equals(less, -1, "less");
        }, "IDBFactory.cmp()");
    })
})
