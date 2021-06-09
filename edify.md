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
//{ "mode": "text" }
npm install indexeddb
```

This `README.md` is also a unit test using the
[Proof](https://github.com/bigeasy/proof) unit test framework. We'll use the
Proof `okay` function to assert out statements in the readme. A Proof unit test
generally looks like this.

```javascript
//{ "code": { "tests": 4 }, "text": { "tests": 4  } }
require('proof')(%(tests)d, async okay => {
    //{ "include": "testRequire" }
    //{ "include": "test" }
    okay('always okay')
    okay(true, 'okay if true')
    okay(1, 1, 'okay if equal')
    okay({ value: 1 }, { value: 1 }, 'okay if deep strict equal')
})
```

## Open for Discussion

At the time of writing I was unable to find an implementation of
`Event`/`EventTarget` that provided an implementation of the "get the parent"
algorithm mentioned in the specification. Without this I was unable to implement
progation of error or abort events from the Transaction to the Database.

Initially I was unable to find an implementation that implemented the

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
