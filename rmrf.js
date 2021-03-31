module.exports = async function (version, fs, path) {
    if (/^v12\./.test(version)) {
        await fs.rmdir(path, { recursive: true })
    } else {
        await fs.rm(path, { recursive: true, force: true })
    }
}
