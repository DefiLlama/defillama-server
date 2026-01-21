import { ADAPTER_TYPES, AdapterType, AdaptorData, AdaptorRecordType, AdaptorRecordTypeMapReverse, IJSON, ProtocolAdaptor, ProtocolType } from "./types";
import dimensions_imports from "../../utils/imports/dimensions_adapters.json"
import { generateProtocolAdaptorsList2 } from "./helpers/generateProtocolAdaptorsList"
import protocols from "../../protocols/data";
import { chainCoingeckoIds, getChainDisplayName } from "../../utils/normalizeChain";
import { baseIconsUrl } from "../../constants";

let dimensionsConfig: any
getDimensionsConfig()

// TODO: reduce the places this is called to improve performance
export const importModule = (adaptorType: AdapterType) => async (mod: string) => {
  // Dynamically import dimension adapter module, this way, we have time to set up the repo if needed
  const { setModuleDefaults } = await import('../../../dimension-adapters/adapters/utils/runAdapter')
  const { default: module } = await import('../../../dimension-adapters/' + dimensionsConfig[adaptorType].imports[mod].moduleFilePath)
  setModuleDefaults(module)
  return module
}

const exportCache = {} as IJSON<AdaptorData>

export default loadAdaptorsData

function loadAdaptorsData(adaptorType: AdapterType): AdaptorData {
  if (!exportCache[adaptorType]) exportCache[adaptorType] = _getAdapterData(adaptorType)
  return exportCache[adaptorType]
}

const _getAdapterData = (adapterType: AdapterType): AdaptorData => {

  // Adapters can have all dimensions in one adapter or multiple adapters for different dimensions
  // Thats why we create an object with all adapters using the spread operator which only references the objects (they load all of them into memory anyways)
  if (!dimensionsConfig[adapterType]) throw new Error(`Couldn't find data for ${adapterType} type`)
  const { KEYS_TO_STORE, imports: allImports } = dimensionsConfig[adapterType]
  const config: any = {}
  const configMetadataMap: any = {}

  protocols.forEach((p) => {
    if (!p.dimensions?.[adapterType]) return;
    let { adapterKey, dimConfig } = getDimensionsConfigAndKey(p.dimensions[adapterType])
    dimConfig.id = p.id
    dimConfig.isChain = false
    dimConfig.isProtocolInOtherCategories = Object.keys(dimensionsConfig).length > 1
    config[adapterKey] = dimConfig
    configMetadataMap[adapterKey] = p
  })

  Object.entries(chainCoingeckoIds).forEach(([chainName, obj]) => {
    if (!obj.dimensions?.[adapterType]) return;

    // let id = obj.chainId ?? obj.cmcId  // NOTE: we are instead using adapterKey as id because it is safer than when chain first has cmcId but we end up adding chainId

    // switch (chainName) {
    //   case 'Ethereum': // because ethereum chain id clashes with bitcoin cmcId
    //   case 'Kardia':  // kardia has chainId 0
    //     id = '' + obj.cmcId;
    //     break;
    // }
    let { adapterKey, dimConfig } = getDimensionsConfigAndKey(obj.dimensions[adapterType])

    if (config[adapterKey]) {
      // you can reach here because there are two labels for the same chain: like Optimism & 'OP Mainnet'
      return;
    }

    const objClone = {
      ...obj,
      displayName: getChainDisplayName(chainName, true),
      name: chainName,
      id: 'chain#' + adapterKey,
      gecko_id: obj.geckoId,
      isChain: true,
      protocolType: ProtocolType.CHAIN,
      category: 'Chain',
      logo: `${baseIconsUrl}/chains/rsz_${getLogoKey(chainName)}.jpg`
    }

    dimConfig.id = objClone.id
    config[adapterKey] = dimConfig
    configMetadataMap[adapterKey] = objClone
  })

  function getDimensionsConfigAndKey(data: any) {
    let adapterKey: string
    let dimConfig: any = data
    if (typeof dimConfig === 'string') {
      adapterKey = dimConfig
      dimConfig = {}
    } else {
      adapterKey = dimConfig.adapter
      dimConfig = { ...dimConfig } // make a copy
      delete dimConfig.adapter
    }

    return { adapterKey, dimConfig }
  }

  const protocolAdaptors = generateProtocolAdaptorsList2({ allImports, config, adapterType, configMetadataMap, })
  const protocolMap = protocolAdaptors.reduce((acc, curr) => {
    acc[curr.id2] = curr
    return acc
  }, {} as IJSON<ProtocolAdaptor>)

  return {
    default: protocolAdaptors,
    KEYS_TO_STORE,
    importModule: importModule(adapterType),
    config,
    protocolAdaptors,
    protocolMap,
  }
}

function addImportsDataToMapping() {
  const allImportsSquashed: any = {}
  Object.entries(dimensions_imports).forEach(([adapterType, imports]) => {
    Object.entries(imports).forEach(([adapterKey, adapterObj]: any) => {
      adapterObj.module = { default: adapterObj.module }
      allImportsSquashed[adapterKey] = adapterObj
    })

    dimensionsConfig[adapterType].imports = imports
  })


  Object.keys(dimensionsConfig).forEach((adapterType) => {
    if (adapterType === AdapterType.DERIVATIVES) return; // derivatives use dexs imports
    if (adapterType === AdapterType.OPEN_INTEREST) return; // OI prioritizes dexs imports (if present) over rest (other than oi itself), so first, we need to build dex imports

    dimensionsConfig[adapterType].imports = { ...allImportsSquashed, ...dimensionsConfig[adapterType].imports }
  })


  dimensionsConfig[AdapterType.DERIVATIVES].imports = dimensionsConfig[AdapterType.DEXS].imports

  // the order matters, wait for other imported to be built before running this
  dimensionsConfig[AdapterType.OPEN_INTEREST].imports = { ...allImportsSquashed, ...dimensionsConfig[AdapterType.DEXS].imports, ...dimensionsConfig[AdapterType.OPEN_INTEREST].imports }

}

function getDimensionsConfig() {
  dimensionsConfig = {
    [AdapterType.DEXS]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyVolume],
        [AdaptorRecordType.totalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalVolume]
      },
    },
    [AdapterType.DERIVATIVES]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyVolume],
        [AdaptorRecordType.totalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalVolume],
      },
    },
    [AdapterType.OPEN_INTEREST]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.openInterestAtEnd]: AdaptorRecordTypeMapReverse[AdaptorRecordType.openInterestAtEnd],
        [AdaptorRecordType.shortOpenInterestAtEnd]: AdaptorRecordTypeMapReverse[AdaptorRecordType.shortOpenInterestAtEnd],
        [AdaptorRecordType.longOpenInterestAtEnd]: AdaptorRecordTypeMapReverse[AdaptorRecordType.longOpenInterestAtEnd],
      },
    },
    [AdapterType.FEES]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyFees],
        [AdaptorRecordType.dailyRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyRevenue],
        [AdaptorRecordType.dailyUserFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyUserFees],
        [AdaptorRecordType.dailySupplySideRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailySupplySideRevenue],
        [AdaptorRecordType.dailyProtocolRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyProtocolRevenue],
        [AdaptorRecordType.dailyHoldersRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyHoldersRevenue],
        [AdaptorRecordType.dailyCreatorRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyCreatorRevenue],
        [AdaptorRecordType.totalFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalFees],
        [AdaptorRecordType.totalRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalRevenue],
        [AdaptorRecordType.totalUserFees]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalUserFees],
        [AdaptorRecordType.totalSupplySideRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalSupplySideRevenue],
        [AdaptorRecordType.totalProtocolRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalProtocolRevenue],
        [AdaptorRecordType.totalHoldersRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalHoldersRevenue],
        [AdaptorRecordType.totalCreatorRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalCreatorRevenue],
        [AdaptorRecordType.dailyBribesRevenue]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyBribesRevenue],
        [AdaptorRecordType.dailyTokenTaxes]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyTokenTaxes]
      },
    },
    [AdapterType.AGGREGATORS]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyVolume],
        [AdaptorRecordType.totalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalVolume]
      },
    },
    [AdapterType.OPTIONS]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.totalPremiumVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalPremiumVolume],
        [AdaptorRecordType.totalNotionalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalNotionalVolume],
        [AdaptorRecordType.dailyPremiumVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyPremiumVolume],
        [AdaptorRecordType.dailyNotionalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyNotionalVolume]
      },
    },
    [AdapterType.INCENTIVES]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.tokenIncentives]: AdaptorRecordTypeMapReverse[AdaptorRecordType.tokenIncentives]
      },
    },
    // [AdapterType.ROYALTIES]: royaltiesData,
    [AdapterType.AGGREGATOR_DERIVATIVES]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyVolume],
        [AdaptorRecordType.totalVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalVolume]
      },
    },
    [AdapterType.BRIDGE_AGGREGATORS]: {
      KEYS_TO_STORE: {
        [AdaptorRecordType.dailyBridgeVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.dailyBridgeVolume],
        [AdaptorRecordType.totalBridgeVolume]: AdaptorRecordTypeMapReverse[AdaptorRecordType.totalBridgeVolume]
      },
    },
  }


  addImportsDataToMapping()
}

function getLogoKey(key: string) {
  if (key.toLowerCase() === 'bsc') return 'binance'
  else return key.toLowerCase()
}

/*

const statsTable: any = {}
ADAPTER_TYPES.forEach((adapterType) => {
  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  const totalCount = protocolAdaptors.length
  const deadCount = protocolAdaptors.filter(p => p.isDead).length
  const liveCount = totalCount - deadCount
  const currTime = protocolAdaptors.filter((p: any) => p._stat_runAtCurrTime && !p.isDead).length
  // console.log(`${adapterType}: total: ${totalCount}, live: ${liveCount}, dead: ${deadCount}, runAtCurrentTime: ${runAtCurrentTimeCount}`)
  statsTable[adapterType] = { total: totalCount, live: liveCount, dead: deadCount, currTime, canRefill: liveCount - currTime }
})

console.table(statsTable)

*/