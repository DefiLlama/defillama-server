import data, { Protocol } from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { sluggifyString } from "../../../utils/sluggify";
import getAllChainsFromAdaptors, { getProtocolsData, isDisabled } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { Adapter, ProtocolType } from "@defillama/adaptors/adapters/types";
import { chainCoingeckoIds } from "../../../utils/normalizeChain"
import { baseIconsUrl } from "../../../constants";

// Obtaining all dex protocols
// const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

const chainData = Object.entries(chainCoingeckoIds).map(([key, obj]) => ({
    ...obj,
    name: key,
    id: obj.cmcId,
    gecko_id: obj.geckoId,
    category: "Chain",
    logo: `${baseIconsUrl}/chains/rsz_${getLogoKey(key)}.jpg`
})) as unknown as Protocol[]

export type IImportsMap = IJSON<{ default: Adapter }>

// This could be much more efficient
export default (imports_obj: IImportsMap, config: AdaptorsConfig): ProtocolAdaptor[] =>
    Object.entries(imports_obj).map(([adapterKey, adapterObj]) => {
        let list = data
        if (adapterObj.default?.protocolType === ProtocolType.CHAIN)
            list = chainData
        const dexFoundInProtocols = list.find(dexP => {
            return (dexP.name.toLowerCase()?.includes(adapterKey)
                || sluggifyString(dexP.name)?.includes(adapterKey)
                || dexP.gecko_id?.includes(adapterKey)
                || dexP.module?.split("/")[0]?.includes(adapterKey)) && getBySpecificId(adapterKey, dexP.id)
        })
        if (dexFoundInProtocols && imports_obj[adapterKey].default)
            return {
                ...dexFoundInProtocols,
                id: ID_MAP[dexFoundInProtocols.id]?.id ?? dexFoundInProtocols.id,
                name: ID_MAP[dexFoundInProtocols.id]?.name ?? dexFoundInProtocols.name,
                module: adapterKey,
                config: config[adapterKey],
                chains: getAllChainsFromAdaptors([adapterKey], imports_obj),
                disabled: isDisabled(imports_obj[adapterKey].default),
                displayName: getDisplayName(dexFoundInProtocols.name, imports_obj[adapterKey].default),
                protocolsData: getProtocolsData(adapterKey, imports_obj[adapterKey].default),
                protocolType: adapterObj.default?.protocolType
            }
        // TODO: Handle better errors
        //console.error(`Missing info for ${adapterKey} DEX!`)
        return undefined
    }).filter(notUndefined);

export function getDisplayName(name: string, adapter: Adapter) {
    if (name === 'AAVE V3') return 'AAVE'
    if (name === 'Uniswap V3') return 'Uniswap'
    if ("breakdown" in adapter && Object.keys(adapter.breakdown).length === 1)
        return `${Object.keys(adapter.breakdown)[0]}`
    return name
}

function getLogoKey(key: string) {
    if (key.toLowerCase() === 'bsc') return 'binance'
    else return key.toLowerCase()
}

// This should be changed to be easier to mantain
export const ID_MAP: IJSON<{ id: string, name: string } | undefined> = {
    "2198": {
        id: "1",
        name: "Uniswap"
    },
    "1599": {
        id: "111",
        name: "AAVE"
    }
}

export const getBySpecificId = (key: string, id: string) => {
    if (key === 'uniswap') return id === "2198"
    if (key === 'aave') return id === "1599"
    return true
}