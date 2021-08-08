require('proof')(9, async okay => {
    await require('./harness')(okay, 'bindings-inject-values-bypass-setters')
    await harness(async function () {

        promise_test(async t => {
          const db = await createDatabase(t, db => {
            db.createObjectStore('store', {autoIncrement: true, keyPath: 'id'});
          });

          let setter_called = false;
          Object.defineProperty(Object.prototype, 'id', {
            configurable: true,
            set: value => { setter_called = true; },
          });
          t.add_cleanup(() => { delete Object.prototype['id']; });

          const tx = db.transaction('store', 'readwrite');
          tx.objectStore('store').put({});
          const result = await promiseForRequest(t, tx.objectStore('store').get(1));

          assert_false(setter_called,
                       'Setter should not be called for key result.');
          assert_true(result.hasOwnProperty('id'),
                      'Result should have own-property overriding prototype setter.');
          assert_equals(result.id, 1,
                        'Own property should match primary key generator value');
        }, 'Returning values to script should bypass prototype setters');

    })
})
