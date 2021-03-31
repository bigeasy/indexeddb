require('proof')(2, async okay => {
    const rmrf = require('../rmrf')
    rmrf('v12.0.0', {
        async rmdir (path, options) {
            okay({ path, options }, {
                path: '/etc',
                options: { recursive: true }
            }, 'rmdir')
        }
    }, '/etc')
    rmrf('v14.0.0', {
        async rm (path, options) {
            okay({ path, options }, {
                path: '/etc',
                options: { recursive: true, force: true }
            }, 'rm')
        }
    }, '/etc')
})
