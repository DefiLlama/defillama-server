import data, { Protocol } from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { getChainsFromBaseAdapter, getMethodologyDataByBaseAdapter } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import { getChainDisplayName } from "../../../utils/normalizeChain"
import chainCoingeckoIds from "./chains"
import { baseIconsUrl } from "../../../constants";
import { IImportObj } from "../../../cli/buildRequires";
import { getCollectionsMap } from "./collections";
import { seaportCollections } from "../fees/collections";

// Obtaining all dex protocols
// const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')

export function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

export function notNull<T>(x: T | null): x is T {
    return x !== null;
}

const dataMap = data.reduce((acc, curr) => {
    acc[curr.id] = curr
    return acc
}, {} as IJSON<Protocol>)

const chainData = Object.entries(chainCoingeckoIds).map(([key, obj]) => {
    if (!obj.cmcId && !obj.chainId) return undefined
    return {
        ...obj,
        displayName: getChainDisplayName(key, true),
        name: key,
        id: obj.cmcId ?? obj.chainId,
        gecko_id: obj.geckoId,
        category: "Chain",
        logo: `${baseIconsUrl}/chains/rsz_${getLogoKey(key)}.jpg`
    }
}).filter(c => c !== undefined) as unknown as Protocol[]

const chainDataMap = chainData.reduce((acc, curr) => {
    acc[curr.id] = curr
    return acc
}, {} as IJSON<Protocol>)

export type IImportsMap = IJSON<IImportObj>

// This could be much more efficient
export default async (imports_obj: IImportsMap, config: AdaptorsConfig, type?: string): Promise<ProtocolAdaptor[]> => {
    const collectionsMap = await getCollectionsMap()
    return Object.entries(imports_obj).map(([adapterKey, adapterObj]) => {
        let list = dataMap
        if (adapterObj.module.default?.protocolType === ProtocolType.CHAIN) {
            list = chainDataMap
        }
        else if (adapterObj.module.default?.protocolType === ProtocolType.COLLECTION) {
            list = collectionsMap
        }
        const protocolId = config?.[adapterKey]?.id
        let moduleObject = imports_obj[adapterKey].module.default
        if (!moduleObject) return
        let dexFoundInProtocolsArr = [] as Protocol[]
        let baseModuleObject = {} as BaseAdapter
        if ('adapter' in moduleObject) {
            if (!protocolId) return
            dexFoundInProtocolsArr.push(list[protocolId])
            baseModuleObject = moduleObject.adapter
        }
        else if ('breakdown' in moduleObject) {
            const protocolsData = config?.[adapterKey]?.protocolsData
            if (!protocolsData) {
                console.error(`No protocols data defined in ${type}'s config for adapter with breakdown`, adapterKey)
                return
            }
            dexFoundInProtocolsArr = Object.values(protocolsData).map(protocolData => {
                if (!list[protocolData.id]) console.error(`Protocol not found with id ${protocolData.id} and key ${adapterKey}`)
                return list[protocolData.id]
            }).filter(notUndefined)
        }
        if (dexFoundInProtocolsArr.length > 0 && imports_obj[adapterKey].module.default) {
            return dexFoundInProtocolsArr.map((dexFoundInProtocols => {
                let configObj = config[adapterKey]
                let versionKey = undefined
                const protData = config?.[adapterKey]?.protocolsData
                if ('breakdown' in moduleObject) {
                    const [key, vConfig] = Object.entries(protData ?? {}).find(([, pd]) => pd.id === dexFoundInProtocols.id) ?? []
                    configObj = vConfig ?? config[adapterKey]
                    if (key) {
                        versionKey = key
                        baseModuleObject = moduleObject.breakdown[key]
                    }
                }
                if (!configObj || !dexFoundInProtocols) return
                const parentConfig = JSON.parse(JSON.stringify(config[adapterKey]))
                delete parentConfig.protocolsData
                const infoItem: ProtocolAdaptor = {
                    ...dexFoundInProtocols,
                    ...configObj,
                    id: isNaN(+config[adapterKey]?.id) ? configObj.id : config[adapterKey].id,
                    module: adapterKey,
                    config: {
                        ...parentConfig,
                        ...configObj,
                    },
                    chains: getChainsFromBaseAdapter(baseModuleObject),
                    disabled: configObj.disabled ?? false,
                    displayName: configObj.displayName ?? dexFoundInProtocols.name,
                    protocolType: adapterObj.module.default?.protocolType,
                    methodologyURL: adapterObj.codePath,
                    methodology: undefined
                }
                const methodology = getMethodologyDataByBaseAdapter(baseModuleObject, type, infoItem.category)
                if (methodology)
                    infoItem.methodology = methodology
                if (versionKey)
                    infoItem.versionKey = versionKey
                return infoItem
            }))
        }
        // TODO: Handle better errors
        console.error(`Missing info for ${adapterKey} on ${type}`)
        return undefined
    }).flat().filter(notUndefined);
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
    if (key === 'pact') return id === "1468"
    if (key === 'karura-swap') return id === "451"
    if (key === 'algofi') return id === "2091"
    if (key === 'penguin') return id === "1575"
    if (key === 'xdai') return id === "1659"
    if (key === 'stargate') return id === "1571"
    if (key === 'thena') return id === "2417"
    if (key === 'verse') return id === "1732"
    if (key === 'blur') return id === "2414"
    if (key === 'solidlydex') return id === "2400"
    if (key === 'tethys-finance') return id === "1139"
    if (key === 'ashswap') return id === "2551"
    if (key === 'dforce') return id === "123"
    return false
}
