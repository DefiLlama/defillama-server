import { AdapterType, } from "@defillama/dimension-adapters/adapters/types";
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

const allImportsSqaushed = Object.values(mapping).reduce((acc, curr) => {
  return { ...acc, ...curr.imports }
}, {})

const _getAdapterData = (adapterType: AdapterType): AdaptorData => {

  // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
  // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
  if (!mapping[adapterType]) throw new Error(`Couldn't find data for ${adapterType} type`)
  const { config, KEYS_TO_STORE, imports } = mapping[adapterType]

  if (!all.imports[adapterType])
    all.imports[adapterType] = {
      ...allImportsSqaushed,
      ...protocolImports,
      ...imports,
    }

  const protocolAdaptors = generateProtocolAdaptorsList2(all.imports[adapterType], config, adapterType)
  const childProtocolAdaptors = protocolAdaptors.flatMap((protocolAdaptor: ProtocolAdaptor) => protocolAdaptor.childProtocols || [])

  return {
    default: generateProtocolAdaptorsList(all.imports[adapterType], config, adapterType),
    KEYS_TO_STORE,
    importModule: importModule(adapterType),
    config,
    rules: getRules(adapterType),
    protocolAdaptors,
    childProtocolAdaptors,
  }
}

export const getRules = (adapterType: AdapterType): AdaptorData['rules'] => {
  return (mapping[adapterType] as any).rules
}
