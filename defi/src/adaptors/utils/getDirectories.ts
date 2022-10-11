import { readdirSync } from 'fs'
export default (source: string) =>
    readdirSync(source, { withFileTypes: true })
        .map(dirent => dirent.name)