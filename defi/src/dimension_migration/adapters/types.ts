import { Balances, ChainApi, util } from '@defillama/sdk';
export type Chain = string

const { blocks: { getChainBlocks } } = util

export type ChainBlocks = Awaited<ReturnType<typeof getChainBlocks>>

export type ChainEndpoints = {
  [chain: string]: string
}

export type FetchResultBase = {
  timestamp?: number;
  block?: number;
};

export type FetchResultV2 = {
  [key: string]: FetchResponseValue | undefined;
};

export type FetchResultGeneric = FetchResultBase & {
  [key: string]: FetchResponseValue | undefined;
}

export type FetchOptions = {
  createBalances: () => Balances;
  getBlock: (timestamp: number, chain: string, chainBlocks: ChainBlocks) => Promise<number>;
  getLogs: (params: FetchGetLogsOptions) => Promise<any[]>;
  toTimestamp: number;
  fromTimestamp: number;
  startOfDay: number;
  getFromBlock: () => Promise<number>;
  getToBlock: () => Promise<number>;
  chain: string,
  api: ChainApi,
  fromApi: ChainApi,
  toApi: ChainApi,
  startTimestamp: number,
  endTimestamp: number,
  getStartBlock: () => Promise<number>,
  getEndBlock: () => Promise<number>,
  dateString: string,
  preFetchedResults?: any,
  moduleUID: string,  // randomly generated unique identifier for the module, useful for caching
  startOfDayId?: string, // id used in some subgraphs to identify daily data, usually it's the startOfDay timestamp divided by 86400
}

export type FetchGetLogsOptions = {
  eventAbi?: string,
  topic?: string,
  target?: string,
  targets?: string[],
  onlyArgs?: boolean,
  fromBlock?: number,
  toBlock?: number,
  flatten?: boolean,
  cacheInCloud?: boolean,
  entireLog?: boolean,
  skipCacheRead?: boolean,
  skipCache?: boolean,
  skipIndexer?: boolean,
  topics?: string[],
  noTarget?: boolean,
  parseLog?: boolean,
}

export type Fetch = (
  timestamp: number,
  chainBlocks: ChainBlocks,
  options: FetchOptions,
) => Promise<FetchResult>;

export type FetchV2 = (
  options: FetchOptions,
) => Promise<FetchResultV2>;

export type IStartTimestamp = () => Promise<number>

export type BaseAdapterChainConfig = {
    start?: IStartTimestamp | number | string; // date can be in "YYYY-MM-DD" format
    fetch?: Fetch | FetchV2;
    runAtCurrTime?: boolean;
  }

export type BaseAdapter = {
  [chain: string]: BaseAdapterChainConfig
};

export enum ProtocolType {
  CHAIN = 'chain',
  PROTOCOL = 'protocol',
  COLLECTION = 'collection',
}

export enum Dependencies {
  DUNE = 'dune',
  ALLIUM = 'allium'
}


export type AdapterBase = {
  timetravel?: boolean
  isExpensiveAdapter?: boolean,
  dependencies?: Dependencies[]
  protocolType?: ProtocolType;
  version?: number;
  deadFrom?: string;
  allowNegativeValue?: boolean;
  doublecounted?: boolean;
  methodology?: string | IJSON<string>;
  breakdownMethodology?: Record<string, string | IJSON<string>>;
  fetch?: Fetch | FetchV2;
  chains?: (string|[string, BaseAdapterChainConfig])[]
  prefetch?: FetchV2;
  runAtCurrTime?: boolean;
  start?: IStartTimestamp | number | string; // date can be in "YYYY-MM-DD" format
  _randomUID?: string; // sometimes fee & volume adapters share the same code, we can optimize the run by caching the results
}

export type SimpleAdapter = AdapterBase & {
  adapter?: BaseAdapter
}

export type BreakdownAdapter = AdapterBase & {
  breakdown: {
    [version: string]: BaseAdapter
  };
};

export type Adapter = SimpleAdapter | BreakdownAdapter;
export type FetchResponseValue = string | number | Balances;

/**
 * Include here new adaptors types
 */

// VOLUME
export type FetchResultVolume = FetchResultBase & {
  dailyVolume?: FetchResponseValue
  totalVolume?: FetchResponseValue
  shortOpenInterestAtEnd?: FetchResponseValue
  longOpenInterestAtEnd?: FetchResponseValue
  openInterestAtEnd?: FetchResponseValue
  dailyBridgeVolume?: FetchResponseValue
  totalBridgeVolume?: FetchResponseValue
};

// FEES
export type FetchResultFees = FetchResultBase & {
  totalFees?: FetchResponseValue;
  dailyFees?: FetchResponseValue;
  dailyUserFees?: FetchResponseValue;
  totalRevenue?: FetchResponseValue;
  dailyRevenue?: FetchResponseValue;
  dailyProtocolRevenue?: FetchResponseValue;
  dailyHoldersRevenue?: FetchResponseValue;
  dailySupplySideRevenue?: FetchResponseValue;
  totalProtocolRevenue?: FetchResponseValue;
  totalSupplySideRevenue?: FetchResponseValue;
  totalUserFees?: FetchResponseValue;
  dailyBribesRevenue?: FetchResponseValue;
  dailyTokenTaxes?: FetchResponseValue;
  totalHoldersRevenue?: FetchResponseValue;
  dailyOtherIncome?: FetchResponseValue;
  totalOtherIncome?: FetchResponseValue;
  dailyOperatingIncome?: FetchResponseValue;
  totalOperatingIncome?: FetchResponseValue;
  dailyNetIncome?: FetchResponseValue;
  totalNetIncome?: FetchResponseValue;
};

// INCENTIVES
export type FetchResultIncentives = FetchResultBase & {
  tokenIncentives?: FetchResponseValue
};

// AGGREGATORS
export type FetchResultAggregators = FetchResultBase & {
  dailyVolume?: FetchResponseValue
  totalVolume?: FetchResponseValue
};

// OPTIONS
export type FetchResultOptions = FetchResultBase & {
  totalPremiumVolume?: FetchResponseValue
  totalNotionalVolume?: FetchResponseValue
  dailyPremiumVolume?: FetchResponseValue
  dailyNotionalVolume?: FetchResponseValue
  shortOpenInterestAtEnd?: FetchResponseValue
  longOpenInterestAtEnd?: FetchResponseValue
  openInterestAtEnd?: FetchResponseValue
};


export enum AdapterType {
  FEES = 'fees',
  DEXS = 'dexs',
  INCENTIVES = 'incentives',
  AGGREGATORS = 'aggregators',
  DERIVATIVES = 'derivatives',
  OPTIONS = 'options',
  PROTOCOLS = 'protocols',
  OPEN_INTEREST = 'open-interest',
  // ROYALTIES = 'royalties',
  AGGREGATOR_DERIVATIVES = 'aggregator-derivatives',
  BRIDGE_AGGREGATORS = 'bridge-aggregators',
}

export type FetchResult = FetchResultVolume & FetchResultFees & FetchResultAggregators & FetchResultOptions & FetchResultIncentives

export const whitelistedDimensionKeys = new Set([
  'startTimestamp', 'chain', 'timestamp', 'block',

  'dailyVolume', 'totalVolume', 'shortOpenInterestAtEnd', 'longOpenInterestAtEnd', 'openInterestAtEnd', 'dailyBridgeVolume', 'totalBridgeVolume',
  'totalFees', 'dailyFees', 'dailyUserFees', 'totalRevenue', 'dailyRevenue', 'dailyProtocolRevenue', 'dailyHoldersRevenue', 'dailySupplySideRevenue', 'totalProtocolRevenue', 'totalSupplySideRevenue', 'totalUserFees', 'dailyBribesRevenue', 'dailyTokenTaxes', 'totalHoldersRevenue',
  'tokenIncentives',
  'dailyOtherIncome', 'totalOtherIncome', 'dailyOperatingIncome', 'totalOperatingIncome', 'dailyNetIncome', 'totalNetIncome',
  'totalPremiumVolume', 'totalNotionalVolume', 'dailyPremiumVolume', 'dailyNotionalVolume',
])
export const accumulativeKeySet = new Set([
  'totalVolume', 'totalBridgeVolume', 'tokenIncentives', 'totalPremiumVolume', 'totalNotionalVolume',
  'totalFees', 'totalRevenue', 'totalProtocolRevenue', 'totalSupplySideRevenue', 'totalUserFees', 'totalHoldersRevenue', 'totalOtherIncome', 'totalOperatingIncome', 'totalNetIncome'
])

// End of specific adaptors type

export interface IJSON<T> {
  [key: string]: T
}

export const ADAPTER_TYPES = Object.values(AdapterType).filter((adapterType: any) => adapterType !== AdapterType.PROTOCOLS)
