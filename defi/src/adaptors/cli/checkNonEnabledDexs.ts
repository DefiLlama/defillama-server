import config from "../data/dexs/config";
import path from "path";
import getDirectories from "../utils/getDirectories";

const enabledDEXs = Object.entries(config).reduce((acc, [dex, enabled]) => {
    if (enabled) acc.push(dex)
    return acc
}, [] as string[])

// const adaptersList = Object.keys(adapters)
const adaptersList = getDirectories(path.resolve('../../DefiLlama-Adapters/volumes/adapters'))
// console.log(adaptersList)

// console.log("Adapters enabled")
// console.log("_______________________")
// enabledDEXs.forEach(enabledDex => console.log(enabledDex))
// console.log("\n")
console.log("Adapters NOT enabled")
adaptersList.forEach(adapter => {
    if (!enabledDEXs.includes(adapter))
        console.log(adapter)
})
