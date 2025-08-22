import protocols, { Protocol } from "../../../protocols/data";
import { AdaptorsConfig, IJSON } from "../types"
import { getChainsFromBaseAdapter, getMethodologyDataByBaseAdapter } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { Adapter, AdapterType, BaseAdapter, ProtocolType, SimpleAdapter } from "@defillama/dimension-adapters/adapters/types";
import { getChainDisplayName, chainCoingeckoIds } from "../../../utils/normalizeChain"
import { baseIconsUrl } from "../../../constants";
import { IParentProtocol } from "../../../protocols/types";

// Obtaining all dex protocols
// const dexs = data.filter(d => d.category === "Dexs" || d.category === 'Derivatives')

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function notNull<T>(x: T | null): x is T {
  return x !== null;
}

const protocolMap = protocols.reduce((acc, curr) => {
  acc[curr.id] = curr
  return acc
}, {} as IJSON<Protocol>)

const chainData = Object.entries(chainCoingeckoIds).map(([key, obj]) => {
  if (!obj.cmcId && !obj.chainId) return undefined
  let id = obj.chainId ?? obj.cmcId
  if (key === 'Ethereum') id = '' + obj.cmcId // because ethereum chain id clashes with bitcoin cmcId
  if (key === 'Kardia') id = '' + obj.cmcId // because ethereum chain id clashes with bitcoin cmcId

  return {
    ...obj,
    displayName: getChainDisplayName(key, true),
    name: key,
    id,
    gecko_id: obj.geckoId,
    category: "Chain",
    logo: `${baseIconsUrl}/chains/rsz_${getLogoKey(key)}.jpg`
  }
}).filter(c => c !== undefined) as unknown as Protocol[]

const chainDataMap = chainData.reduce((acc, curr) => {
  if (acc[curr.id]) return acc;
  acc[curr.id] = curr
  return acc
}, {} as IJSON<Protocol>)

interface IImportObj {
  module: { default: Adapter },
  codePath: string
  moduleFilePath: string
}
export type IImportsMap = IJSON<IImportObj>

// This could be much more efficient
export default (imports_obj: IImportsMap, config: AdaptorsConfig, type?: string): ProtocolAdaptor[] => {
  return Object.entries(imports_obj).map(([adapterKey, adapterObj]) => {
    let list = protocolMap
    if (adapterObj.module.default?.protocolType === ProtocolType.CHAIN) {
      list = chainDataMap
    }
    const protocolId = config?.[adapterKey]?.id
    let moduleObject = imports_obj[adapterKey].module.default
    if (!moduleObject) return
    let dexFoundInProtocolsArr = [] as Protocol[]
    let baseModuleObject = {} as BaseAdapter
    if ('adapter' in moduleObject) {
      if (!protocolId) return
      dexFoundInProtocolsArr.push(list[protocolId])
      baseModuleObject = moduleObject.adapter!
    }
    if (dexFoundInProtocolsArr.length > 0 && imports_obj[adapterKey].module.default) {
      return dexFoundInProtocolsArr.map((dexFoundInProtocols => {
        try {
          let configObj = config[adapterKey]
          let versionKey = undefined
          if (!configObj || !dexFoundInProtocols) return
          if (!baseModuleObject) throw "Unable to find the module adapter, please check the breakdown keys or config module names"
          const parentConfig = JSON.parse(JSON.stringify(config[adapterKey]))
          const id = !isNaN(+config[adapterKey]?.id) ? configObj.id : config[adapterKey].id // used to query db, eventually should be changed to defillamaId
          const protocolType = (moduleObject as any).protocolType
          const infoItem: ProtocolAdaptor = {
            ...dexFoundInProtocols,
            ...configObj,
            id: isNaN(+config[adapterKey]?.id) ? configObj.id : config[adapterKey].id, // used to query db, eventually should be changed to defillamaId,
            id2: protocolType === ProtocolType.CHAIN ? `chain#${adapterKey}` : id,
            defillamaId: isNaN(+configObj?.id) ? configObj.id : config[adapterKey].id,
            module: adapterKey,
            config: {
              ...parentConfig,
              ...configObj,
            },
            chains: getChainsFromBaseAdapter(baseModuleObject),
            logo: getLlamaoLogo(dexFoundInProtocols.logo),
            displayName: configObj.displayName ?? dexFoundInProtocols.name,
            protocolType,
            methodologyURL: adapterObj.codePath,
            methodology: undefined
          }
          const methodology = getMethodologyDataByBaseAdapter(moduleObject as SimpleAdapter, type, infoItem.category)
          if (methodology)
            infoItem.methodology = methodology
          if (versionKey)
            infoItem.versionKey = versionKey
          return infoItem
        } catch (e) {
          console.error(e)
          return undefined
        }
      }))
    }
    // TODO: Handle better errors
    console.error(`Missing info for ${adapterKey} on ${type}`)
    return undefined
  }).flat().filter(notUndefined);
}


export function generateProtocolAdaptorsList2({ allImports, config, adapterType, otherATId2s }: { allImports: IImportsMap, config: AdaptorsConfig, adapterType?: AdapterType, otherATId2s: Set<string> }): ProtocolAdaptor[] {
  return Object.entries(allImports).map(([adapterKey, adapterObj]) => {
    
    try {
      let list = protocolMap
      if (adapterObj.module.default?.protocolType === ProtocolType.CHAIN)
        list = chainDataMap

      let configObj = config[adapterKey]
      if (!configObj) return;
      const protocolId = config?.[adapterKey].id
      let moduleObject = allImports[adapterKey].module.default
      if (!moduleObject) throw new Error(`No module found for ${adapterKey}`)

      const protocolType = (moduleObject as any).protocolType
      let protocol: Protocol | IParentProtocol
      let baseModuleObject = {} as BaseAdapter
      let chains: string[] = []
      let childProtocols: ProtocolAdaptor[] = []


      // select protocol details based on if the module is an adapter or a breakdown
      if ('adapter' in moduleObject) {

        if (!protocolId) throw new Error(`No protocol id found for ${adapterKey}`)
        protocol = list[protocolId]
        baseModuleObject = moduleObject.adapter!
        chains = getChainsFromBaseAdapter(baseModuleObject)


      } else if ('breakdown' in moduleObject) {
        throw new Error('Breakdown adapters are deprecated, migrate it to use simple adapter')
      }

      if (!protocol!) throw new Error(`No protocol found for ${adapterKey}`)


      if (!baseModuleObject) throw "Unable to find the module adapter, please check the breakdown keys or config module names"
      let singleVersionKey: string

      const id = isNaN(+configObj.id) ? configObj.id : config[adapterKey].id // used to query db, eventually should be changed to defillamaId
      const id2 = protocolType === ProtocolType.CHAIN ? `chain#${adapterKey}` : id


      const infoItem: ProtocolAdaptor = {
        ...protocol!,
        ...configObj,
        id,
        id2,
        defillamaId: protocol.id,
        module: adapterKey,
        config: { ...configObj, },
        chains,
        chain: (protocol as any)!.chain ?? chains[0],
        logo: getLlamaoLogo(protocol!.logo),
        displayName: configObj.displayName ?? protocol!.name,
        protocolType,
        isProtocolInOtherCategories: otherATId2s.has(id2),
        methodologyURL: adapterObj.codePath,
        methodology: undefined,
        _stat_adapterVersion: adapterObj.module.default?.version ?? 1,
        _stat_runAtCurrTime: JSON.stringify(adapterObj.module.default ?? '').includes('runAtCurrTime'),
        _stat_allowNegative: !!adapterObj.module.default?.allowNegativeValue,
        doublecounted: moduleObject.doublecounted ?? false,
      } as any

      if (singleVersionKey!) infoItem.versionKey = singleVersionKey

      const methodology = getMethodologyDataByBaseAdapter(moduleObject, adapterType, infoItem.category)
      if (methodology) infoItem.methodology = methodology
      if (childProtocols.length > 0) infoItem.childProtocols = childProtocols

      return infoItem

    } catch (e) {
      console.error(e)
      console.error(`Missing info for ${adapterKey} on ${adapterType}`)
      return undefined
    }
  }).filter(notUndefined);
}

function getLogoKey(key: string) {
  if (key.toLowerCase() === 'bsc') return 'binance'
  else return key.toLowerCase()
}

const getLlamaoLogo = (logo: string | null) => {
  if (!logo) return logo
  if (logo.includes('chains')) return logo.replace("https://icons.llama.fi/", "https://icons.llamao.fi/icons/")
  return logo.replace("https://icons.llama.fi/", "https://icons.llamao.fi/icons/protocols/")
}
