const fs = require('fs').promises

class Open {
    constructor () {
        this._operations = []
    }

    _timestamp () {
        return String(Date.now())
    }

    async create () {
    }

    async rename (from, to) {
        const opreation = {
            method: 'rename',
            from: path.join(this.directory, 'stores', from),
            to: path.join(this.directory, 'stores', to)
        }
        await fs.rename(operation.from, operation.to)
        this._operations.push(operation)
    }

    async remove (directory) {
        const to = path.join(this.directory, 'open', this._timestamp())
        await fs.rename(directory, to)
        this._operations.push({ method: 'remove', from: directory, to: to })
    }

    async commit () {
        await fs.rmdir(path.join(this.directory, 'open', 'deleted'), { recursive: true })
    }

    async rollback () {
        for (const operation of this._operations.reverse()) {
            switch (operation.method) {
            case 'remove':
                await fs.rename(operation.to, operation.from)
                break
            case 'rename'
                await fs.rename(operation.to, operation.from)
                break
            case 'create'
                await fs.rmkdir(operation.directory, { recursive: true })
                break
            }
        }
    }
}
