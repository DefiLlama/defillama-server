import dexVolumes from "@defillama/adapters/volumes";
import data, { Protocol } from "../../protocols/data";
import config from "./config"
import type { IVolumesConfig } from "./config"
import getAllChainsFromDexAdapters from "../utils/getChainsFromDexAdapters";
import { sluggifyString } from "../../utils/sluggify";
import { fees, volumes } from "./adapter-modules";
/**
 * Using data from protocols since its more complete
 */

export interface Dex extends Protocol {
    volumeAdapter: string
    feesAdapter: string
    config?: IVolumesConfig
}

// Obtaining all dex protocols
const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')
// Getting list of all volume adapters
const dexAdaptersKeys = Object.keys(dexVolumes).map(k => k.toLowerCase())
/* fees
volumes */
// Adding data to dex objects
const dexData: Dex[] = dexAdaptersKeys.map(adapterKey => {
    const dexFoundInProtocols = dexes.find(dexP =>
        dexP.name.toLowerCase()?.includes(adapterKey)
        || sluggifyString(dexP.name)?.includes(adapterKey)
        || dexP.gecko_id?.includes(adapterKey)
        || dexP.module.split("/")[0]?.includes(adapterKey)
    )    
    if (dexFoundInProtocols) 
        return {
            ...dexFoundInProtocols,
            chains: getAllChainsFromDexAdapters([adapterKey]),
            volumeAdapter: adapterKey,
            feesAdapter: volumes.find(dexP =>
                dexP.toLowerCase()?.includes(adapterKey)
                || sluggifyString(dexP)?.includes(adapterKey)
            )??''    ,
            config: config[adapterKey]
        }
    // TODO: Handle better errors
    //console.error(`Missing info for ${adapterKey} DEX!`)
    return undefined
}).filter(notUndefined);

const dexData2: Dex[] = volumes.map(adapterKey => {
    const dexFoundInProtocols = dexes.find(dexP =>
        dexP.name.toLowerCase()?.includes(adapterKey)
        || sluggifyString(dexP.name)?.includes(adapterKey)
        || dexP.gecko_id?.includes(adapterKey)
        || dexP.module.split("/")[0]?.includes(adapterKey)
    )    
    if (dexFoundInProtocols) 
        return {
            ...dexFoundInProtocols,
            chains: getAllChainsFromDexAdapters([adapterKey]),
            volumeAdapter: adapterKey,
            feesAdapter: volumes.find(dexP =>
                dexP.toLowerCase()?.includes(adapterKey)
                || sluggifyString(dexP)?.includes(adapterKey)
            )??''    ,
            config: config[adapterKey]
        }
    // TODO: Handle better errors
    //console.error(`Missing info for ${adapterKey} DEX!`)
    return undefined
}).filter(notUndefined);

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

console.log(volumes)
console.log(dexData.length)
console.log(dexData.map(m=>m.name).filter(f=>!dexData2.map(d=>d.name).includes(f)))

export default dexData