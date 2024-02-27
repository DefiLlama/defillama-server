import protocols, { Protocol } from "../../../protocols/data";
import parentProtocols from "../../../protocols/parentProtocols";
import { AdaptorsConfig, IJSON } from "../types"
import { getDisplayChainName, getChainsFromBaseAdapter, getMethodologyDataByBaseAdapter } from "../../utils/getAllChainsFromAdaptors";
import { ProtocolAdaptor } from "../types";
import { AdapterType, BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import { getChainDisplayName } from "../../../utils/normalizeChain"
import chainCoingeckoIds from "./chains"
import { baseIconsUrl } from "../../../constants";
import { IImportObj } from "../../../cli/buildRequires";
import { IParentProtocol } from "../../../protocols/types";

// Obtaining all dex protocols
// const dexes = data.filter(d => d.category === "Dexes" || d.category === 'Derivatives')

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

const parentProtocolDataMap = parentProtocols.reduce((acc, curr) => {
  acc[curr.id] = curr
  return acc
}, {} as IJSON<IParentProtocol>)

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
      baseModuleObject = moduleObject.adapter
    }
    else if ('breakdown' in moduleObject) {
      const protocolsData = config?.[adapterKey]?.protocolsData
      if (!protocolsData) {
        // console.error(`No protocols data defined in ${type}'s config for adapter with breakdown`, adapterKey)
        return
      }
      dexFoundInProtocolsArr = Object.values(protocolsData).map(protocolData => {
        if (!list[protocolData.id]) console.error(`Protocol not found with id ${protocolData.id} and key ${adapterKey}`)
        return list[protocolData.id]
      }).filter(notUndefined)
    }
    if (dexFoundInProtocolsArr.length > 0 && imports_obj[adapterKey].module.default) {
      return dexFoundInProtocolsArr.map((dexFoundInProtocols => {
        try {
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
          if (!baseModuleObject) throw "Unable to find the module adapter, please check the breakdown keys or config module names"
          const parentConfig = JSON.parse(JSON.stringify(config[adapterKey]))
          delete parentConfig.protocolsData
          const id = !isNaN(+config[adapterKey]?.id) ? configObj.id : config[adapterKey].id // used to query db, eventually should be changed to defillamaId
          const protocolType = (moduleObject as any).default?.protocolType
          const infoItem: ProtocolAdaptor = {
            ...dexFoundInProtocols,
            ...configObj,
            id,
            id2: protocolType === ProtocolType.CHAIN ? `chain#${id}` : id,
            defillamaId: isNaN(+configObj?.id) ? configObj.id : config[adapterKey].id,
            module: adapterKey,
            config: {
              ...parentConfig,
              ...configObj,
            },
            chains: getChainsFromBaseAdapter(baseModuleObject),
            logo: getLlamaoLogo(dexFoundInProtocols.logo),
            disabled: configObj.disabled ?? false,
            displayName: configObj.displayName ?? dexFoundInProtocols.name,
            protocolType,
            methodologyURL: adapterObj.codePath,
            methodology: undefined
          }
          const methodology = getMethodologyDataByBaseAdapter(baseModuleObject, type, infoItem.category)
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


export function generateProtocolAdaptorsList2({allImports, config, adapterType, otherATId2s }: {allImports: IImportsMap, config: AdaptorsConfig, adapterType?: AdapterType, otherATId2s: Set<string>}): ProtocolAdaptor[] {
  return Object.entries(allImports).map(([adapterKey, adapterObj]) => {
    try {
      let list = protocolMap
      if (adapterObj.module.default?.protocolType === ProtocolType.CHAIN)
        list = chainDataMap

      // Check if the module is enabled
      let configObj = config[adapterKey]
      if (!configObj?.enabled) return;
      const protocolId = config?.[adapterKey].id
      let moduleObject = allImports[adapterKey].module.default
      if (!moduleObject) throw new Error(`No module found for ${adapterKey}`)

      const protocolType = (moduleObject as any).default?.protocolType
      let protocol: Protocol | IParentProtocol
      let baseModuleObject = {} as BaseAdapter
      let chains: string[] = []
      let childProtocols: ProtocolAdaptor[] = []


      // select protocol details based on if the module is an adapter or a breakdown
      if ('adapter' in moduleObject) {

        if (!protocolId) throw new Error(`No protocol id found for ${adapterKey}`)
        protocol = list[protocolId]
        baseModuleObject = moduleObject.adapter
        chains = getChainsFromBaseAdapter(baseModuleObject)


      } else if ('breakdown' in moduleObject) {

        const protocolsData = config?.[adapterKey]?.protocolsData
        if (!protocolsData)
          console.error(`No protocols data defined in ${adapterType}'s config for adapter with breakdown`, adapterKey)
        const ids: Array<string> = []
        const parentIds: Array<string> = []

        Object.entries(protocolsData as any).forEach(([versionKey, versionConfig]: any) => {
          if (!versionConfig.enabled) return;

          const childConfig = { ...configObj, ...versionConfig }
          delete childConfig.protocolsData
          const adapter = (moduleObject as any).breakdown[versionKey]
          if (!adapter) throw new Error(`No adapter found for ${versionKey}`)
          baseModuleObject = adapter

          const id = versionConfig.id
          const childProtocol = list[id]
          const childChains = getChainsFromBaseAdapter(adapter)
          chains.push(...childChains)

          if (!ids.includes(id)) {
            ids.push(id)
            const parentId = childProtocol.parentProtocol
            if (parentId && !parentIds.includes(parentId)) parentIds.push(parentId)
          }

          if (!childProtocol) console.error(`Protocol not found with id ${versionConfig.id} and key ${adapterKey}`)
          const id2 = protocolType === ProtocolType.CHAIN ? `chain#${id}` : id

          childProtocols.push({
            ...childProtocol,
            ...childConfig,
            id,
            id2,
            defillamaId: versionConfig.id,
            module: adapterKey,
            config: { ...childConfig },
            chains: childChains,
            logo: getLlamaoLogo(childProtocol.logo),
            disabled: childConfig.disabled ?? false,
            displayName: childConfig.displayName ?? childProtocol.name,
            protocolType,
            versionKey,
            isProtocolInOtherCategories: otherATId2s.has(id2),
            methodologyURL: adapterObj.codePath,
            methodology: getMethodologyDataByBaseAdapter(adapter, adapterType, childProtocol.category) ?? undefined
          })
        })

        if (ids.length === 0 && !protocolId) return
        if (ids.length === 1) {
          // if (protocolId !== ids[0])
          //   throw new Error(`Protocol id ${protocolId} does not match the only protocol id in the protocolsData array for ${adapterKey}`)
          protocol = list[ids[0]]
          if (!protocol) throw new Error(`No protocol found for ${adapterKey}`)
          childProtocols = [] // if there is only one protocol, we don't need to list the children
        } else {
          if (!parentIds.length) throw new Error(`No parentIds found for ${adapterKey}`)
          if (parentIds.length > 1) throw new Error(`More than one parentId found for ${adapterKey}`)
          protocol = parentProtocolDataMap[parentIds[0]]
          baseModuleObject = {} as BaseAdapter
        }

        chains = [...new Set(chains)]
      }

      if (!protocol!) throw new Error(`No protocol found for ${adapterKey}`)


      if (!baseModuleObject) throw "Unable to find the module adapter, please check the breakdown keys or config module names"
      const parentConfig = JSON.parse(JSON.stringify(config[adapterKey]))
      delete parentConfig.protocolsData
      const id = isNaN(+configObj.id) ? configObj.id : config[adapterKey].id // used to query db, eventually should be changed to defillamaId
      const id2 = protocolType === ProtocolType.CHAIN ? `chain#${id}` : id


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
        disabled: configObj.disabled ?? false,
        displayName: configObj.displayName ?? protocol!.name,
        protocolType,
        isProtocolInOtherCategories: otherATId2s.has(id2),
        methodologyURL: adapterObj.codePath,
        methodology: undefined
      } as any

      const methodology = getMethodologyDataByBaseAdapter(baseModuleObject, adapterType, infoItem.category)
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
