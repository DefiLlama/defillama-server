import { Balances, ChainApi, util } from '@defillama/sdk';
import sdk from '@defillama/sdk';
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
  streamLogs: (params: Parameters<typeof sdk.indexer.getLogs>[0] & {
    targetsFilter?: string[] | Set<string>
  }) => Promise<any[]>;
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
  moduleUID: string,  // randomly generated unique identifier for the module, useful for caching (used only for batch processing dune queries for now)
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
  start?: IStartTimestamp | number | string; // date can be in "YYYY-MM-DD" format -  indicates when the adapter can start fetching data
  deadFrom?: IStartTimestamp | number | string; // date can be in "YYYY-MM-DD" format - indicates when the adapter should stop fetching data
  fetch?: Fetch | FetchV2;
  runAtCurrTime?: boolean;
}

export const whitelistedBaseAdapterKeys = new Set([
  'start', 'deadFrom', 'fetch', 'runAtCurrTime'
])

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
  chains?: (string | [string, BaseAdapterChainConfig])[]
  prefetch?: FetchV2;
  runAtCurrTime?: boolean;
  start?: IStartTimestamp | number | string; // date can be in "YYYY-MM-DD" format
  _randomUID?: string; // sometimes fee & volume adapters share the same code, we can optimize the run by caching the results - We stopped caching these results but left as is as it is used in batching dune queries, we can re-use it later if needed
  pullHourly?: boolean;
  skipBreakdownValidation?: boolean; // this is to skip the validation that requires at least one of dailyRevenue, dailySupplySideRevenue or dailyProtocolRevenue to be present when dailyFees is present, this is useful for some adapters that have a breakdown in their dailyFees but dont have a clear way to attribute the fees to either supply side or protocol revenue
}

export type SimpleAdapter = AdapterBase & {
  adapter?: BaseAdapter
}

export type Adapter = SimpleAdapter;
export type FetchResponseValue = string | number | Balances;

/**
 * Include here new adaptors types
 */

// VOLUME
export type FetchResultVolume = FetchResultBase & {
  dailyVolume?: FetchResponseValue
  shortOpenInterestAtEnd?: FetchResponseValue
  longOpenInterestAtEnd?: FetchResponseValue
  openInterestAtEnd?: FetchResponseValue
  dailyBridgeVolume?: FetchResponseValue
  dailyNormalizedVolume?: FetchResponseValue
  dailyActiveLiquidity?: FetchResponseValue
};

// FEES
export type FetchResultFees = FetchResultBase & {
  dailyFees?: FetchResponseValue;
  dailyUserFees?: FetchResponseValue;
  dailyRevenue?: FetchResponseValue;
  dailyProtocolRevenue?: FetchResponseValue;
  dailyHoldersRevenue?: FetchResponseValue;
  dailySupplySideRevenue?: FetchResponseValue;
  dailyBribesRevenue?: FetchResponseValue;
  dailyTokenTaxes?: FetchResponseValue;
  dailyOtherIncome?: FetchResponseValue;
  dailyOperatingIncome?: FetchResponseValue;
  dailyNetIncome?: FetchResponseValue;
};

// INCENTIVES
export type FetchResultIncentives = FetchResultBase & {
  tokenIncentives?: FetchResponseValue
};

// AGGREGATORS
export type FetchResultAggregators = FetchResultBase & {
  dailyVolume?: FetchResponseValue
};

export type FetchResultActiveUsers = FetchResultBase & {
  dailyActiveUsers?: FetchResponseValue;
  dailyTransactionsCount?: FetchResponseValue;
  dailyGasUsed?: FetchResponseValue;
};

export type FetchResultNewUsers = FetchResultBase & {
  dailyNewUsers?: FetchResponseValue;
};

// OPTIONS
export type FetchResultOptions = FetchResultBase & {
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
  NORMALIZED_VOLUME = 'normalized-volume',
  NFT_VOLUME = 'nft-volume',
  ACTIVE_USERS = 'active-users',
  NEW_USERS = 'new-users',
}

export type FetchResult = FetchResultVolume & FetchResultFees & FetchResultAggregators & FetchResultOptions & FetchResultIncentives & FetchResultActiveUsers & FetchResultNewUsers

export const whitelistedDimensionKeys = new Set([
  'startTimestamp', 'chain', 'timestamp', 'block',

  'dailyVolume', 'shortOpenInterestAtEnd', 'longOpenInterestAtEnd', 'openInterestAtEnd', 'dailyBridgeVolume', 'dailyNormalizedVolume', 'dailyActiveLiquidity',
  'totalFees', 'dailyFees', 'dailyUserFees', 'dailyRevenue', 'dailyProtocolRevenue', 'dailyHoldersRevenue', 'dailySupplySideRevenue', 'dailyBribesRevenue', 'dailyTokenTaxes',
  'tokenIncentives',
  'dailyOtherIncome', 'dailyOperatingIncome', 'dailyNetIncome',, 'dailyPremiumVolume', 'dailyNotionalVolume',
  'dailyActiveUsers', 'dailyNewUsers', 'dailyTransactionsCount', 'dailyGasUsed',
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
