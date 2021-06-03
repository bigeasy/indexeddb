require('proof')(1, okay => {
    const Event = require('../idl/Event')
//    const { JSDOM } = require('jsdom')
//    console.log(JSDOM)

//    const jsdom = new JSDOM('<html></html')
//    console.log(new jsdom.window.EventTarget)

    const object = {}

//    EventTarget.install(object, [ 'Window' ])
    Event.install(object, [ 'Window' ])

//    console.log(object)

//    console.log(new object.EventTarget)

//    class Targetable extends object.EventTarget {
//        constructor () {
//            super()
 //       }
  //  }

//    const targetable = new Targetable

//    targetable.addEventListener('hello', () => console.log('hello'))

//    targetable.dispatchEvent(new object.Event('hello'))
    okay(new object.Event('hello').type, 'hello', 'event')
})
