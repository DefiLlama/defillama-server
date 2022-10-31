import dexVolumes from "@defillama/adapters/volumes";
import data, { Protocol } from "../../protocols/data";
import config from "./config"
import type { IVolumesConfig } from "./config"
import getAllChainsFromDexAdapters from "../utils/getChainsFromDexAdapters";
import { sluggifyString } from "../../utils/sluggify";
import { getBySpecificId, getDisplayName, ID_MAP } from "../../adaptors/data/helpers/generateProtocolAdaptorsList";
/**
 * Using data from protocols since its more complete
 */

export interface Dex extends Protocol {
    volumeAdapter: string
    config?: IVolumesConfig
}

// Obtaining all dex protocols
const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')
// Getting list of all volume adapters
const dexAdaptersKeys = Object.keys(dexVolumes).map(k => k.toLowerCase())
// Adding data to dex objects
const dexData: Dex[] = dexAdaptersKeys.map(adapterKey => {
    const dexFoundInProtocols = dexes.find(dexP =>
        (dexP.name.toLowerCase()?.includes(adapterKey)
        || sluggifyString(dexP.name)?.includes(adapterKey)
        || dexP.gecko_id?.includes(adapterKey)
        || dexP.module.split("/")[0]?.includes(adapterKey)) && getBySpecificId(adapterKey, dexP.id)
    )
    if (dexFoundInProtocols) 
        return {
            ...dexFoundInProtocols,
            id: ID_MAP[dexFoundInProtocols.id]?.id.toString() ?? dexFoundInProtocols.id,
            name:  ID_MAP[dexFoundInProtocols.id]?.name ?? dexFoundInProtocols.name,
            chains: getAllChainsFromDexAdapters([adapterKey]),
            volumeAdapter: adapterKey,
            config: config[adapterKey]
        }
    // TODO: Handle better errors
    //console.error(`Missing info for ${adapterKey} DEX!`)
    return undefined
}).filter(notUndefined);

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

export default dexData