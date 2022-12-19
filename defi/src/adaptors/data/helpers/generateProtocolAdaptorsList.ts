import data, { Protocol } from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { sluggifyString } from "../../../utils/sluggify";
import getAllChainsFromAdaptors, { getMethodologyData, getProtocolsData, isDisabled } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { Adapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import { chainCoingeckoIds, getChainDisplayName } from "../../../utils/normalizeChain"
import { baseIconsUrl } from "../../../constants";
import { IImportObj } from "../../../cli/buildRequires";
import { getMethodologyByType } from "./methodology";
import overrides from "./overrides";

// Obtaining all dex protocols
// const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')

function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

const chainData = Object.entries(chainCoingeckoIds).map(([key, obj]) => {
    if (!obj.cmcId && !obj.chainId) return undefined
    return {
        ...obj,
        name: key,
        id: obj.cmcId ?? obj.chainId,
        gecko_id: obj.geckoId,
        category: "Chain",
        logo: `${baseIconsUrl}/chains/rsz_${getLogoKey(key)}.jpg`
    }
}).filter(c => c !== undefined) as unknown as Protocol[]

export type IImportsMap = IJSON<IImportObj>

// This could be much more efficient
export default (imports_obj: IImportsMap, config: AdaptorsConfig): ProtocolAdaptor[] =>
    Object.entries(imports_obj).map(([adapterKey, adapterObj]) => {
        let list = data
        if (adapterObj.module.default?.protocolType === ProtocolType.CHAIN)
            list = chainData
        const dexFoundInProtocols = list.find(dexP => {
            return getBySpecificId(adapterKey, dexP.id) && (dexP.name.toLowerCase()?.includes(adapterKey)
                || sluggifyString(dexP.name)?.includes(adapterKey)
                || dexP.gecko_id?.includes(adapterKey)
                || dexP.module?.split("/")[0]?.includes(adapterKey))
        })
        if (dexFoundInProtocols && imports_obj[adapterKey].module.default) {
            let moduleObject = imports_obj[adapterKey].module.default
            if (config?.[adapterKey]?.protocolsData && 'breakdown' in moduleObject)
                moduleObject = {
                    ...moduleObject,
                    breakdown: Object.entries(moduleObject.breakdown)
                        .filter(([vName, _adapter]) => config?.[adapterKey]?.protocolsData?.[vName]?.enabled)
                        .reduce((acc, [vName, adapter]) => {
                            acc[vName] = adapter
                            return acc
                        }, {} as typeof moduleObject.breakdown)
                } as Adapter
            return {
                ...dexFoundInProtocols,
                ...overrides[adapterKey],
                module: adapterKey,
                config: config[adapterKey],
                chains: getAllChainsFromAdaptors([adapterKey], moduleObject),
                disabled: isDisabled(moduleObject),
                displayName: getDisplayName(dexFoundInProtocols.name, moduleObject),
                protocolsData: getProtocolsData(adapterKey, moduleObject, dexFoundInProtocols.category ?? ''),
                protocolType: adapterObj.module.default?.protocolType,
                methodologyURL: adapterObj.codePath,
                methodology: getMethodologyData(adapterKey, moduleObject, dexFoundInProtocols.category ?? '')
            }
        }
        // TODO: Handle better errors
        console.error(`Missing info for ${adapterKey}`)
        return undefined
    }).filter(notUndefined);

export function getDisplayName(name: string, adapter: Adapter) {
    if (name.split(' ')[0].includes('AAVE')) return 'AAVE'
    if (name.split(' ')[0].includes('Uniswap')) return 'Uniswap'
    if (name === '0x') return '0x - RFQ'
    if ("breakdown" in adapter && Object.keys(adapter.breakdown).length === 1) {
        const versionName = Object.keys(adapter.breakdown)[0]
        return `${name} - ${versionName.charAt(0).toUpperCase()}${versionName.slice(1)}`
    }
    if (adapter.protocolType === ProtocolType.CHAIN) return getChainDisplayName(name.toLowerCase(), true)
    return name
}

function getLogoKey(key: string) {
    if (key.toLowerCase() === 'bsc') return 'binance'
    else return key.toLowerCase()
}

// This should be changed to be easier to mantain
export const ID_MAP: IJSON<{ id: string, name: string } | undefined> = {
    "2196": {
        id: "1",
        name: "Uniswap"
    },
    "1599": {
        id: "111",
        name: "AAVE"
    }
}

export const getBySpecificId = (key: string, id: string) => {
    if (key === 'uniswap') return id === "2196"
    if (key === 'aave') return id === "1599"
    if (key === 'mimo') return id === "1241"
    if (key === '0x') return id === "2116"
    if (key === 'pact') return id === "541"
    if (key === 'karura-swap') return id === "451"
    if (key === 'algofi') return id === "2091"
    if (key === 'penguin') return id === "1575"
    if (key === 'xdai') return id === "1659"
    if (key === 'stargate') return id === "1571"
    return true
}