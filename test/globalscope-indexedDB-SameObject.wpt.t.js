require('proof')(1, async okay => {
    await require('./harness')(okay, 'globalscope-indexedDB-SameObject')
    await harness(async function () {

        test(t => {
          assert_equals(self.indexedDB, self.indexedDB,
                        'Attribute should yield the same object each time');

        }, 'indexedDB is [SameObject]');

    })
})
