import { AdapterType, ProtocolType, } from "@defillama/dimension-adapters/adapters/types";
import { ADAPTER_TYPES, AdaptorData, IJSON, ProtocolAdaptor } from "./types";
import * as dexData from "./dexs"
import * as derivativesData from "./derivatives"
import * as feesData from "./fees"
import * as aggregatorsData from "./aggregators"
import * as optionsData from "./options"
import * as incentivesData from "./incentives"
// import * as royaltiesData from "./royalties"
import * as bridgeAggregatorsData from "./bridge-aggregators";
import * as aggregatorDerivativesData from "./aggregator-derivatives";
import generateProtocolAdaptorsList, { IImportsMap, generateProtocolAdaptorsList2 } from "./helpers/generateProtocolAdaptorsList"

const mapping: any = {
  [AdapterType.DEXS]: dexData,
  [AdapterType.DERIVATIVES]: derivativesData,
  [AdapterType.FEES]: feesData,
  [AdapterType.AGGREGATORS]: aggregatorsData,
  [AdapterType.OPTIONS]: optionsData,
  [AdapterType.INCENTIVES]: incentivesData,
  // [AdapterType.ROYALTIES]: royaltiesData,
  [AdapterType.AGGREGATOR_DERIVATIVES]: aggregatorDerivativesData,
  [AdapterType.BRIDGE_AGGREGATORS]: bridgeAggregatorsData,
}

export const importModule = (adaptorType: AdapterType) => (mod: string) => import(all.imports[adaptorType][mod].moduleFilePath)

const all = { imports: {} } as { imports: IJSON<IImportsMap> }

const exportCache = {} as IJSON<AdaptorData>

export default (adaptorType: AdapterType): AdaptorData => {
  if (!exportCache[adaptorType]) exportCache[adaptorType] = _getAdapterData(adaptorType)
  return exportCache[adaptorType]
}


function getOtherAdaperTypeId2s(adapterType: AdapterType): Set<string> {
  const otherAdapterIds = new Set<string>()

  ADAPTER_TYPES.forEach((type) => {
    if (type === adapterType) return;
    if (!mapping[type]) return;
    const imports = getImports(type)
    const config= mapping[type].config
    Object.entries(imports).forEach(([adapterKey, adapterObj]) => {
      if (!config[adapterKey]) return;
      const isChain = adapterObj.module.default?.protocolType === ProtocolType.CHAIN
      const id = isChain ? 'chain#' + config[adapterKey].id : config[adapterKey].id
      otherAdapterIds.add(id)
      Object.values(config[adapterKey].protocolsData ?? {}).forEach((config: any ) => {
        otherAdapterIds.add(config.id)
      })
    })
  })

  return otherAdapterIds
}

const allImportsSqaushed: any = Object.values(mapping).reduce((acc: any, curr: any) => {
  return { ...acc, ...curr.imports }
}, {} as any)

function getImports(adapterType: AdapterType) {
  if (!all.imports[adapterType])
    all.imports[adapterType] = {
      ...allImportsSqaushed,
      ...mapping[adapterType].imports,
    }
  return all.imports[adapterType]
}

const _getAdapterData = (adapterType: AdapterType): AdaptorData => {

  // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
  // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
  if (!mapping[adapterType]) throw new Error(`Couldn't find data for ${adapterType} type`)
  const { config, KEYS_TO_STORE, } = mapping[adapterType]
  const allImports = getImports(adapterType)
  const otherATId2s = getOtherAdaperTypeId2s(adapterType)
  const protocolAdaptors = generateProtocolAdaptorsList2({ allImports, config, adapterType, otherATId2s })
  const childProtocolAdaptors = protocolAdaptors.flatMap((protocolAdaptor: ProtocolAdaptor) => protocolAdaptor.childProtocols || [])
  const protocolMap = protocolAdaptors.reduce((acc, curr) => {
    acc[curr.id2] = curr
    return acc
  }, {} as IJSON<ProtocolAdaptor>)

  return {
    default: generateProtocolAdaptorsList(allImports, config, adapterType),
    KEYS_TO_STORE,
    importModule: importModule(adapterType),
    config,
    rules: getRules(adapterType),
    protocolAdaptors,
    childProtocolAdaptors,
    protocolMap,
  }
}

export const getRules = (adapterType: AdapterType): AdaptorData['rules'] => {
  return (mapping[adapterType] as any).rules
}
