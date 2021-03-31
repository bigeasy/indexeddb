module.exports = async function (okay, name) {
    const fs = require('fs').promises
    const path = require('path')
    const directory = path.join(__dirname, 'tmp', name)
    if (fs.rm != null) {
        await fs.rm(directory, { recursive: true, force: true })
    } else {
        await fs.rmdir(directory, { recursive: true })
    }
    await fs.mkdir(directory, { recursive: true })
    class Test {
    }
    const indexedDB = require('..').create({ directory })
    global.indexedDB = indexedDB
    okay.leak('indexedDB')
    global.Test = Test
    okay.leak('Test')
}
