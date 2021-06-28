require('proof')(1, async okay => {
    await require('./harness')(okay, 'idbindex-multientry-arraykeypath')
    await harness(async function () {
        createdb(async_test()).onupgradeneeded = function(e) {
            var store = e.target.result.createObjectStore("store");

            assert_throws_dom('InvalidAccessError', function() {
                store.createIndex('actors', ['name'], { multiEntry: true })
            });

            this.done();
        };
    })
})
