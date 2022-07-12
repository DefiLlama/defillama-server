import dexVolumes from "../../../DefiLlama-Adapters/dexVolumes";
import data from "../../protocols/data";
/**
 * Using data from protocols since its more complete
 */

// Obtaining all dex protocols
const dexes = data.filter(d => d.category === "Dexes")
// Getting list of all volume adapters
const dexAdaptersKeys = Object.keys(dexVolumes).map(k => k.toLowerCase())
// Adding data to dex objects
const dexData = dexAdaptersKeys.map(adapterKey => {
    const dexFoundInProtocols = dexes.find(dexP =>
        dexP.name.toLowerCase()?.includes(adapterKey)
        || dexP.gecko_id?.includes(adapterKey)
        || dexP.module.split("/")[0]?.includes(adapterKey)
    )
    if (dexFoundInProtocols) return {
        ...dexFoundInProtocols,
        volumeAdapter: adapterKey
    }
    // TODO: Handle better errors
    console.error(`Missing info for ${adapterKey} DEX!`)
    return undefined
}).filter(notUndefined);

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

export default dexData