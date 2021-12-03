import fs from "fs"
import protocols from "../protocols/data";

const main = async () => {
    const files = fs.readdirSync('./DefiLlama-Adapters/projects/');
    const modules = protocols.map(p=>p.module.split('/')[0])
    const unlisted = files.filter(file=>!modules.includes(file))
    console.log(unlisted)
}
main()