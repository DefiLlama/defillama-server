import config from "../../adaptors/data/dexs/config";
import config_new from "../data/dexs/config";
import path from "path";
import getDirectories from "../utils/getDirectories";

const moduleKeys_old = Object.keys(config)
const modules_new = Object.keys(config_new)

console.log("Adapters NOT included")
moduleKeys_old.forEach(adapter => {
    if (!modules_new.includes(adapter))
        console.log(adapter)
})
