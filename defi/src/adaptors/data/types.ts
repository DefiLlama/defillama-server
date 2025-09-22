import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { Protocol } from "../../protocols/types"

export interface ICleanRecordsConfig {
    genuineSpikes: IJSON<boolean> | boolean
}

export type ChartBreakdownOptions = 'daily' | 'weekly' | 'monthly'

export type ProtocolDimensionsExtraConfig = {
  defaultChartView?: ChartBreakdownOptions;
  adapter: string;
  genuineSpikes?: string[]  // list of unix timestamps with valid spikes,
}

export type DimensionsConfig = {
  [K in AdapterType]?: string | ProtocolDimensionsExtraConfig;
}
export interface ProtocolAdaptor extends Protocol {
    defillamaId: string
    displayName: string
    defaultChartView?: ChartBreakdownOptions
    config?: IConfig
    id2: string
    isProtocolInOtherCategories?: boolean
    protocolType?: ProtocolType
    adapterType?: ProtocolType
    methodologyURL: string
    methodology?: string | IJSON<string> | any
    allAddresses?: Array<string>
    startFrom?: number
    childProtocols?: Array<ProtocolAdaptor>
    doublecounted?: boolean,
    isDead?: boolean,
}

export interface IConfig {
    id: string
    startFrom?: number
    displayName?: string
    defaultChartView?: ChartBreakdownOptions
    cleanRecordsConfig?: ICleanRecordsConfig
    isChain?: boolean
}

export interface IJSON<T> {
    [key: string]: T
}

export type AdaptorsConfig = IJSON<IConfig>

export type AdaptorData = {
    default: ProtocolAdaptor[]
    protocolAdaptors: ProtocolAdaptor[]
    importModule: (module: string) => any
    KEYS_TO_STORE: IJSON<string>
    config: IJSON<IConfig>
    protocolMap: IJSON<ProtocolAdaptor>
}

export const getExtraN30DTypes = (type: AdapterType) => EXTRA_N30D_TYPE[type] ?? []

export const getExtraTypes = (type: AdapterType) => EXTRA_TYPES[type] ?? []
export const getAdapterRecordTypes = (type: AdapterType) => {
    return [DEFAULT_CHART_BY_ADAPTOR_TYPE[type], ...getExtraTypes(type)]
}

export type ExtraTypes = {
    dailyRevenue?: number | null
    dailyUserFees?: number | null
    dailyHoldersRevenue?: number | null
    dailyCreatorRevenue?: number | null
    dailySupplySideRevenue?: number | null
    dailyProtocolRevenue?: number | null
    dailyPremiumVolume?: number | null
}


export enum AdaptorRecordType {
    dailyVolume = "dv",
    totalVolume = "tv",
    totalPremiumVolume = "tpv",
    totalNotionalVolume = "tnv",
    dailyPremiumVolume = "dpv",
    dailyNotionalVolume = "dnv",
    tokenIncentives = "ti",
    // fees & revenue
    dailyFees = "df",
    dailyBribesRevenue = "dbr",
    dailyTokenTaxes = "dtt",
    shortOpenInterestAtEnd = "dsoi",
    longOpenInterestAtEnd = "dloi",
    openInterestAtEnd = "doi",
    dailyRevenue = "dr",
    dailyUserFees = "duf",
    dailySupplySideRevenue = "dssr",
    dailyProtocolRevenue = "dpr",
    dailyHoldersRevenue = "dhr",
    dailyCreatorRevenue = "dcr",
    totalFees = "tf",
    totalRevenue = "tr",
    totalUserFees = "tuf",
    totalSupplySideRevenue = "tssr",
    totalProtocolRevenue = "tpr",
    totalHoldersRevenue = "thr",
    totalCreatorRevenue = "tcr",
    totalBribesRevenue = "tbr",
    totalTokenTaxes = "ttt",

    dailyBridgeVolume = "dbv",
    totalBridgeVolume = "tbv",

    dailyAppRevenue = "dar",
    dailyAppFees = "daf",
}

export const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<AdaptorRecordType> = {
    [AdapterType.DEXS]: AdaptorRecordType.dailyVolume,
    [AdapterType.DERIVATIVES]: AdaptorRecordType.dailyVolume,
    [AdapterType.FEES]: AdaptorRecordType.dailyFees,
    [AdapterType.AGGREGATORS]: AdaptorRecordType.dailyVolume,
    [AdapterType.OPTIONS]: AdaptorRecordType.dailyPremiumVolume,
    [AdapterType.INCENTIVES]: AdaptorRecordType.tokenIncentives,
    // [AdapterType.ROYALTIES]: AdaptorRecordType.dailyFees,
    [AdapterType.AGGREGATOR_DERIVATIVES]: AdaptorRecordType.dailyVolume,
    [AdapterType.BRIDGE_AGGREGATORS]: AdaptorRecordType.dailyBridgeVolume,
}

export const ACCOMULATIVE_ADAPTOR_TYPE: IJSON<AdaptorRecordType> = {
    [AdaptorRecordType.dailyVolume]: AdaptorRecordType.totalVolume,
    [AdaptorRecordType.dailyFees]: AdaptorRecordType.totalFees,
    [AdaptorRecordType.dailyNotionalVolume]: AdaptorRecordType.totalNotionalVolume,
    [AdaptorRecordType.dailyPremiumVolume]: AdaptorRecordType.totalPremiumVolume,
    [AdaptorRecordType.dailyRevenue]: AdaptorRecordType.totalRevenue,
    [AdaptorRecordType.dailyUserFees]: AdaptorRecordType.totalUserFees,
    [AdaptorRecordType.dailyHoldersRevenue]: AdaptorRecordType.totalHoldersRevenue,
    [AdaptorRecordType.dailyCreatorRevenue]: AdaptorRecordType.totalCreatorRevenue,
    [AdaptorRecordType.dailySupplySideRevenue]: AdaptorRecordType.totalSupplySideRevenue,
    [AdaptorRecordType.dailyProtocolRevenue]: AdaptorRecordType.totalProtocolRevenue,
    [AdaptorRecordType.dailyBribesRevenue]: AdaptorRecordType.totalBribesRevenue,
    [AdaptorRecordType.dailyTokenTaxes]: AdaptorRecordType.totalTokenTaxes,
    [AdaptorRecordType.dailyBridgeVolume]: AdaptorRecordType.totalBridgeVolume,
}


const EXTRA_TYPES: IJSON<AdaptorRecordType[]> = {
    [AdapterType.FEES]: [
        AdaptorRecordType.dailyRevenue,
        AdaptorRecordType.dailyUserFees,
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyCreatorRevenue,
        AdaptorRecordType.dailySupplySideRevenue,
        AdaptorRecordType.dailyProtocolRevenue,
        AdaptorRecordType.dailyBribesRevenue,
        AdaptorRecordType.dailyTokenTaxes,
        AdaptorRecordType.dailyAppRevenue,
        AdaptorRecordType.dailyAppFees,
    ],
    /* [AdapterType.ROYALTIES]: [
        AdaptorRecordType.dailyRevenue,
        AdaptorRecordType.dailyUserFees,
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyCreatorRevenue,
        AdaptorRecordType.dailySupplySideRevenue,
        AdaptorRecordType.dailyProtocolRevenue
    ], */
    [AdapterType.OPTIONS]: [
        AdaptorRecordType.dailyNotionalVolume,
    ],
    [AdapterType.DERIVATIVES]: [
        AdaptorRecordType.shortOpenInterestAtEnd,
        AdaptorRecordType.longOpenInterestAtEnd,
        AdaptorRecordType.openInterestAtEnd
    ]
}

const EXTRA_N30D_TYPE: IJSON<AdaptorRecordType[]> = {
    [AdapterType.FEES]: [
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyBribesRevenue,
        AdaptorRecordType.dailyTokenTaxes,
    ],
}

export const AdaptorRecordTypeMap = Object.entries(AdaptorRecordType).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJSON<AdaptorRecordType>)
export const AdaptorRecordTypeMapReverse = Object.entries(AdaptorRecordType).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {} as IJSON<string>)

export const ADAPTER_TYPES = Object.values(AdapterType).filter((adapterType: any) => adapterType !== AdapterType.PROTOCOLS)
