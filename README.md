[![Actions Status](https://github.com/bigeasy/indexeddb/workflows/Node%20CI/badge.svg)](https://github.com/bigeasy/indexeddb/actions)
[![codecov](https://codecov.io/gh/bigeasy/indexeddb/branch/master/graph/badge.svg)](https://codecov.io/gh/bigeasy/indexeddb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A pure-JavaScript, persistent implementation of IndexedDB.

| What          | Where                                         |
| --- | --- |
| Discussion    | https://github.com/bigeasy/indexeddb/issues/1 |
| Documentation | https://bigeasy.github.io/indexeddb           |
| Source        | https://github.com/bigeasy/indexeddb          |
| Issues        | https://github.com/bigeasy/indexeddb/issues   |
| CI            | https://travis-ci.org/bigeasy/indexeddb       |
| Coverage:     | https://codecov.io/gh/bigeasy/indexeddb       |
| License:      | MIT                                           |


IndexedDB installs from NPM.

```text
npm install indexeddb
```

This `README.md` is also a unit test using the
[Proof](https://github.com/bigeasy/proof) unit test framework. We'll use the
Proof `okay` function to assert out statements in the readme. A Proof unit test
generally looks like this.

```javascript
require('proof')(4, async okay => {
    okay('always okay')
    okay(true, 'okay if true')
    okay(1, 1, 'okay if equal')
    okay({ value: 1 }, { value: 1 }, 'okay if deep strict equal')
})
```

## Open for Discussion

I am unable to find an implementation of `Event`/`EventTarget` on NPM that
provided an implementation of the "get the parent" algorithm mentioned in the
specification. Without this I was unable to implement progation of error or
abort events from the Request to the Transaction to the Database.

At the outset I was unable to find an implementation that implemented the
`legacyOutputHandlersDidThrowFlag` that was added to address a "monkey patch" of
the DOM by IndexedDB that went unnoticed for years. Essentially, there is no way
to know if a dispatched event generated an error. It doens't concert the UI
event model of the DOM, but IndexedDB need to know if an event handler failed so
it can abort the transaction.

I extracted the `Event`/`EventTarget` implementation from JSDOM because it
appeared to have a complete "get the parent." I added the
`legacyOutputHandlersDidThrowFlag` which is simply a flag, so that was simple
enough. At that point I thought that their might be a future where this change
could get rolled back into JSDOM and this IndexedDB implementation could use the
JSDOM event targets as a module.

However, during testing I found that it would not correctly create a
list of targets such that the event maintained its `target` property during
bubbling. There appears to be something in the specification that allows for
invocation with an explicit `EventTarget` path with the event `target` property
specified, but the logic of JSDOM does not seem to offer a path where the event
is not retargeted if the existing target is not a `Node`.

With that, the prospect of getting a patch back into JSDOM have dimmed, but the
next issue I'm pretty sure we're going to have to accept that this
implementation of IndexedDB will have to maintain a separate implementation of
JSDOM.

There is a test in the Web Platform Test IndexedDB test suite called X that
asserts that a Promise executed in an event handler attached to a request will
execute before the next event handler is invoked. This behavior changes if you
call `dispatchEvent` which will dispatch the event synchronously.

It would appear that the only event dispatch implementation in JSDOM is the
`_dispatch` function which is synchronous so all event handlers will be called
and there will be no way to clear the microtask queue.

The test will not pass until a I'm able to provide a new implementation of
`_dispatch` that is optionally asynchronous. Which for my future reference I'll
say I could implement with
[Recriprocate](https://github.com/bigeasy/reciprocate).

What strkes me as particularlly peculiar is that there is no mention of an event
queue in the Living DOM. The test dictates the desired behavior that is
obviously impossible with a synchrnous `dispatchEvent` and even makes mention of
the synchronousness of `dispatchEvent` in a comment in the code. Searching
StackOverflow produces a question &mdash;
[Why is there a difference in the task/microtask execution order when a button
is programmatically clicked vs DOM
clicked?](https://stackoverflow.com/questions/55709512/why-is-there-a-difference-in-the-task-microtask-execution-order-when-a-button-is)
&mdash; that confirms this behavior, but it is not specified with the same sort
of detail used to specify the event queues in IndexedDB itself. To understand it
fully I'd probably have to read the Chrome or Mozilla source.

Was informed in one thread that you could start with the [Simple implementation
of
EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget#simple_implementation_of_eventtarget)
at MDN, but this simple implementation barely covers the dispatch algorithm as
documented in the spec.

I've noticed that the Node.js source goes to great lengths to make private
members private using symbols. I've yet to adopt this style of programming
myself. It adds a lot of code to declare an identifier before you use it when
you can just type it as you need it. If privacy is so dear the language should
(and has) add support for private members that can still be referenced merely by
typing out an identifier name.

Add a note about the `true` hack that got event bubbling working, or not
working, that is suppressed when bubbles is false.
