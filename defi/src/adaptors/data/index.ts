import { AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import { AdaptorData, IJSON, ProtocolAdaptor } from "./types";
import * as dexData from "./dexs"
import * as derivativesData from "./derivatives"
import * as feesData from "./fees"
import * as aggregatorsData from "./aggregators"
import * as optionsData from "./options"
import * as incentivesData from "./incentives"
import * as protocolsData from "./protocols"
import * as royaltiesData from "./royalties"
import * as aggregatorDerivativesData from "./aggregator-derivatives";
import generateProtocolAdaptorsList, { IImportsMap, generateProtocolAdaptorsList2 } from "./helpers/generateProtocolAdaptorsList"
import { ADAPTER_TYPES } from "../handlers/triggerStoreAdaptorData";

const mapping = {
  [AdapterType.DEXS]: dexData,
  [AdapterType.DERIVATIVES]: derivativesData,
  [AdapterType.FEES]: feesData,
  [AdapterType.AGGREGATORS]: aggregatorsData,
  [AdapterType.OPTIONS]: optionsData,
  [AdapterType.INCENTIVES]: incentivesData,
  [AdapterType.PROTOCOLS]: protocolsData,
  [AdapterType.ROYALTIES]: royaltiesData,
  [AdapterType.AGGREGATOR_DERIVATIVES]: aggregatorDerivativesData
}

export const importModule = (adaptorType: AdapterType) => (mod: string) => import(all.imports[adaptorType][mod].moduleFilePath)

const all = { imports: {} } as { imports: IJSON<IImportsMap> }

const exportCache = {} as IJSON<AdaptorData>

export default (adaptorType: AdapterType): AdaptorData => {
  if (!exportCache[adaptorType]) exportCache[adaptorType] = _getAdapterData(adaptorType)
  return exportCache[adaptorType]
}

const protocolImports = protocolsData.imports

function getOtherAdaperTypeId2s(adapterType: AdapterType): Set<string> {
  const otherAdapterIds = new Set<string>()

  ADAPTER_TYPES.forEach((type) => {
    if (type === adapterType) return;
    if (!mapping[type]) return;
    const imports = getImports(type)
    const config = mapping[type].config
    Object.entries(imports).forEach(([adapterKey, adapterObj]) => {
      if (!config[adapterKey]?.enabled) return;
      const isChain = adapterObj.module.default?.protocolType === ProtocolType.CHAIN
      const id = isChain ? 'chain#' + config[adapterKey].id : config[adapterKey].id
      otherAdapterIds.add(id)
      Object.values(config[adapterKey].protocolsData ?? {}).forEach(config => {
        if (config.enabled) otherAdapterIds.add(config.id)
      })
    })
  })

  return otherAdapterIds
}

const allImportsSqaushed = Object.values(mapping).reduce((acc, curr) => {
  return { ...acc, ...curr.imports }
}, {})

function getImports(adapterType: AdapterType) {
  if (!all.imports[adapterType])
    all.imports[adapterType] = {
      ...allImportsSqaushed,
      ...protocolImports,
      ...mapping[adapterType].imports,
    }
  return all.imports[adapterType]
}

const _getAdapterData = (adapterType: AdapterType): AdaptorData => {

  // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
  // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
  if (!mapping[adapterType]) throw new Error(`Couldn't find data for ${adapterType} type`)
  const { config, KEYS_TO_STORE, imports } = mapping[adapterType]
  const isProtocolTypeDexsOrFees = [AdapterType.DEXS, AdapterType.FEES].includes(adapterType);
  const protocolConfig = isProtocolTypeDexsOrFees ? mapping[AdapterType.PROTOCOLS].config : {};
  const allImportsByAdaptertype = getImports(adapterType)
  const allImportsTypeProtocols = isProtocolTypeDexsOrFees ? getImports(AdapterType.PROTOCOLS) : {}
  const allImports = Object.entries(allImportsTypeProtocols).reduce((acc, [key, value]) => {
    if (!acc.hasOwnProperty(key)) {
        acc[key] = value;
    }
    return acc;
  }, {...allImportsByAdaptertype});
  const allConfig = Object.entries(protocolConfig).reduce((acc, [key, value]) => {
    if (!acc.hasOwnProperty(key)) {
        acc[key] = value;
    }
    return acc;
  }, {...config});
  const otherATId2s = getOtherAdaperTypeId2s(adapterType)
  const protocolAdaptors = generateProtocolAdaptorsList2({ allImports, config: allConfig, adapterType, otherATId2s })
  const childProtocolAdaptors = protocolAdaptors.flatMap((protocolAdaptor: ProtocolAdaptor) => protocolAdaptor.childProtocols || [])
  const protocolMap = protocolAdaptors.reduce((acc, curr) => {
    acc[curr.id2] = curr
    return acc
  }, {} as IJSON<ProtocolAdaptor>)

  return {
    default: generateProtocolAdaptorsList(allImports, allConfig, adapterType),
    KEYS_TO_STORE,
    importModule: importModule(adapterType),
    config: allConfig,
    rules: getRules(adapterType),
    protocolAdaptors,
    childProtocolAdaptors,
    protocolMap,
  }
}

export const getRules = (adapterType: AdapterType): AdaptorData['rules'] => {
  return (mapping[adapterType] as any).rules
}
