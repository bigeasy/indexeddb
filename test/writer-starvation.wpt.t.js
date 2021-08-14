require('proof')(29, async okay => {
    await require('./harness')(okay, 'writer-starvation')
    await harness(async function () {
            var db, read_request_count = 0, read_success_count = 0;
            var write_request_count = 0, write_success_count = 0;
            var RQ_COUNT = 25;

            var open_rq = createdb(async_test(undefined));
            open_rq.onupgradeneeded = function(e) {
                db = e.target.result;
                db.createObjectStore("s")
                  .add("1", 1);
            }

            open_rq.onsuccess = function(e) {
                var i = 0, continue_reading = true;

                /* Pre-fill some read requests */
                for (i = 0; i < RQ_COUNT; i++)
                {
                    read_request_count++;

                    db.transaction("s")
                      .objectStore("s")
                      .get(1)
                      .onsuccess = this.step_func(function(e) {
                            read_success_count++;
                            assert_equals(e.target.transaction.mode, "readonly", 'is readonly');
                        });
                }

                this.step(loop);

                function loop() {
                    read_request_count++;

                    db.transaction("s")
                      .objectStore("s")
                      .get(1)
                      .onsuccess = this.step_func(function(e)
                    {
                        read_success_count++;
                        // Replaced because because we invoke this function multiple times
                        // based on a timer timeout, the `step_timeout` below gets invoked
                        // if it has not completed.
                        if (e.target.transaction.mode != "readonly") {
                            throw new Error
                        }

                        if (read_success_count >= RQ_COUNT && write_request_count == 0)
                        {
                            write_request_count++;

                            db.transaction("s", "readwrite")
                              .objectStore("s")
                              .add("written", read_request_count)
                              .onsuccess = this.step_func(function(e)
                            {
                                write_success_count++;
                                assert_equals(e.target.transaction.mode, "readwrite", 'is readwrite');
                                assert_equals(e.target.result, read_success_count,
                                               "write cb came before later read cb's")
                            });

                            /* Reads done after the write */
                            for (i = 0; i < 5; i++)
                            {
                                read_request_count++;

                                db.transaction("s")
                                  .objectStore("s")
                                  .get(1)
                                  .onsuccess = this.step_func(function(e)
                                {
                                    read_success_count++;
                                });
                            }
                        }
                    });

                    if (read_success_count < RQ_COUNT + 5) {
                        step_timeout(this.step_func(loop), write_request_count ? 1000 : 100);
                    } else {
                        // This is merely a "nice" hack to run finish after the last request is done
                        db.transaction("s")
                          .objectStore("s")
                          .count()
                          .onsuccess = this.step_func(function()
                        {
                            step_timeout(this.step_func(finish), 100);
                        });
                    }
                }
            }


        function finish() {
            assert_equals(read_request_count, read_success_count, "read counts");
            assert_equals(write_request_count, write_success_count, "write counts");
            this.done();
        }
    })
})
