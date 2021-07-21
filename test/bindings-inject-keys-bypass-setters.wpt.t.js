require('proof')(9, async okay => {
    await require('./harness')(okay, 'bindings-inject-keys-bypass-setters')
    await harness(async function () {

        promise_test(async t => {
          const db = await createDatabase(t, db => {
            db.createObjectStore('store');
          });

          let setter_called = false;
          Object.defineProperty(Object.prototype, '10', {
            configurable: true,
            set: value => { console.log('set'); setter_called = true; },
          });
          t.add_cleanup(() => { delete Object.prototype['10']; });

          const tx = db.transaction('store', 'readwrite');
          const result = await promiseForRequest(t, tx.objectStore('store').put(
              'value', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'key']));

          assert_false(setter_called,
                       'Setter should not be called for key result.');
          assert_true(result.hasOwnProperty('10'),
                      'Result should have own-property overriding prototype setter.');
          assert_equals(result[10], 'key',
                        'Result should have expected property.');
        }, 'Returning keys to script should bypass prototype setters');

    })
})
