require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const PRO_API_KEY = process.env.PRO_API_KEY || 'api-key';

function isProApi(baseUrl: string): boolean {
  return baseUrl.startsWith('https://pro-api.llama.fi');
}

function getBaseUrl(url: string, category: string): string {
  if (isProApi(url)) {
    if (url.includes('/api-key/')) {
      return url;
    }
    return `${url}/${PRO_API_KEY}/${category}`;
  }
  return url;
}

// Helper to get Pro API base URL with API key
function getProApiBaseUrl(): string {
  const proUrl = process.env.BETA_PRO_API_URL || 'https://pro-api.llama.fi';
  if (proUrl.includes('/api-key/')) {
    return proUrl;
  }
  return `${proUrl}/${PRO_API_KEY}`;
}

export const BASE_URLS = {
  TVL: getBaseUrl(process.env.BETA_API_URL || process.env.BASE_API_URL || 'https://api.llama.fi', 'tvl'),
  COINS: getBaseUrl(process.env.BETA_COINS_URL || 'https://coins.llama.fi', 'coins'),
  STABLECOINS: getProApiBaseUrl(), // Pro API only, no fallback
  YIELDS: getBaseUrl(process.env.BETA_YIELDS_URL || 'https://yields.llama.fi', 'yields'),
  BRIDGES: getProApiBaseUrl(), // Pro API only, no fallback
  VOLUMES: getBaseUrl(process.env.BETA_API_URL || 'https://api.llama.fi', 'volumes'),
  FEES: getBaseUrl(process.env.BETA_API_URL || 'https://api.llama.fi', 'fees'),
  USERS: getProApiBaseUrl(),
  MAIN_PAGE: getProApiBaseUrl(),
  UNLOCKS: getProApiBaseUrl(),
  YIELDS_PRO: getProApiBaseUrl(),
  PERPS: getProApiBaseUrl(),
  ETFS: getProApiBaseUrl(),
  NARRATIVES: getProApiBaseUrl(),
};

const stablecoinsBaseUrl = BASE_URLS.STABLECOINS;
const isStablecoinsPro = isProApi(stablecoinsBaseUrl);

function getEndpoint(path: string, freeOnly: boolean = false): string {
  if (!isStablecoinsPro && !freeOnly) {
    return '';
  }
  return path;
}

export const TVL = {
  BASE_URL: BASE_URLS.TVL,
  PROTOCOLS: '/protocols',
  PROTOCOL: (protocol: string) => `/protocol/${protocol}`,
  CHARTS: (chain?: string) => chain ? `/charts/${chain}` : '/charts',
  TVL: (protocol: string) => `/tvl/${protocol}`,
  HISTORICAL_CHAIN_TVL: '/v2/historicalChainTvl',
  HISTORICAL_CHAIN_TVL_BY_CHAIN: (chain: string) => `/v2/historicalChainTvl/${chain}`,
  CHAINS_V2: '/v2/chains',
  CHAIN_ASSETS: '/chainAssets',
  TOKEN_PROTOCOLS: (symbol: string) => `/tokenProtocols/${symbol}`,
  INFLOWS: (protocol: string, timestamp: number) => `/inflows/${protocol}/${timestamp}`,
} as const;

export const STABLECOINS = {
  BASE_URL: stablecoinsBaseUrl,
  LIST: '/stablecoins/stablecoins',
  CHAINS: '/stablecoins/stablecoinchains',
  PRICES: '/stablecoins/stablecoinprices',
  CHARTS_ALL: '/stablecoins/stablecoincharts/all',
  CHARTS_BY_CHAIN: (chain: string) => `/stablecoins/stablecoincharts/${chain}`,
  ASSET: (asset: string) => `/stablecoins/stablecoin/${asset}`,
  DOMINANCE: (chain: string) => `/stablecoins/stablecoindominance/${chain}`,
} as const;

export const YIELDS = {
  BASE_URL: BASE_URLS.YIELDS,
  POOLS: '/pools',
  CHART: (pool: string) => `/chart/${pool}`,
} as const;

export const COINS = {
  BASE_URL: BASE_URLS.COINS,
  PRICES_CURRENT: (coins: string) => `/prices/current/${coins}`,
  PRICES_HISTORICAL: (timestamp: number, coins: string) => `/prices/historical/${timestamp}/${coins}`,
  CHART: (coins: string) => `/chart/${coins}`,
  PERCENTAGE: (coins: string) => `/percentage/${coins}`,
  PRICES_FIRST: (coins: string) => `/prices/first/${coins}`,
  BLOCK: (chain: string, timestamp: number) => `/block/${chain}/${timestamp}`,
} as const;

export const VOLUMES = {
  BASE_URL: BASE_URLS.VOLUMES,
  OVERVIEW_DEXS: '/overview/dexs',
  OVERVIEW_DEXS_CHAIN: (chain: string) => `/overview/dexs/${chain}`,
  SUMMARY_DEXS: (protocol: string) => `/summary/dexs/${protocol}`,
  OVERVIEW_OPTIONS: '/overview/options',
  OVERVIEW_OPTIONS_CHAIN: (chain: string) => `/overview/options/${chain}`,
  SUMMARY_OPTIONS: (protocol: string) => `/summary/options/${protocol}`,
} as const;

export const FEES = {
  BASE_URL: BASE_URLS.FEES,
  OVERVIEW_FEES: '/overview/fees',
  OVERVIEW_FEES_CHAIN: (chain: string) => `/overview/fees/${chain}`,
  SUMMARY_FEES: (protocol: string) => `/summary/fees/${protocol}`,
} as const;

export const BRIDGES = {
  BASE_URL: BASE_URLS.BRIDGES,
  BRIDGES: '/bridges/bridges',
  BRIDGE: (id: string) => `/bridges/bridge/${id}`,
  BRIDGE_VOLUME: (chain: string) => `/bridges/bridgevolume/${chain}`,
  BRIDGE_DAY_STATS: (timestamp: number, chain: string) => `/bridges/bridgedaystats/${timestamp}/${chain}`,
  TRANSACTIONS: (id: string) => `/bridges/transactions/${id}`,
} as const;

export const USERS = {
  BASE_URL: BASE_URLS.USERS,
  ACTIVE_USERS: '/api/activeUsers',
  USER_DATA: (type: string, protocolId: string) => `/api/userData/${type}/${protocolId}`,
} as const;

export const MAIN_PAGE = {
  BASE_URL: getProApiBaseUrl(),
  CATEGORIES: '/api/categories',
  FORKS: '/api/forks',
  ORACLES: '/api/oracles',
  HACKS: '/api/hacks',
  RAISES: '/api/raises',
  TREASURIES: '/api/treasuries',
  ENTITIES: '/api/entities',
} as const;

export const UNLOCKS = {
  BASE_URL: getProApiBaseUrl(),
  EMISSIONS: '/api/emissions',
  EMISSION: (protocol: string) => `/api/emission/${protocol}`,
} as const;

export const YIELDS_PRO = {
  BASE_URL: getProApiBaseUrl(),
  POOLS: '/yields/pools',
  CHART: (pool: string) => `/yields/chart/${pool}`,
  POOLS_OLD: '/yields/poolsOld',
  POOLS_BORROW: '/yields/poolsBorrow',
  CHART_LEND_BORROW: (pool: string) => `/yields/chartLendBorrow/${pool}`,
  PERPS: '/yields/perps',
  LSD_RATES: '/yields/lsdRates',
} as const;

export const PERPS = {
  BASE_URL: getProApiBaseUrl(),
  OVERVIEW_OPEN_INTEREST: '/api/overview/open-interest',
  OVERVIEW_DERIVATIVES: '/api/overview/derivatives',
  SUMMARY_DERIVATIVES: (protocol: string) => `/api/summary/derivatives/${protocol}`,
} as const;

export const ETFS = {
  BASE_URL: getProApiBaseUrl(),
  SNAPSHOT: '/etfs/snapshot',
  FLOWS: '/etfs/flows',
} as const;

export const NARRATIVES = {
  BASE_URL: getProApiBaseUrl(),
  FDV_PERFORMANCE: (period: string) => `/fdv/performance/${period}`,
} as const;

export const TOKEN_LIQUIDITY = {
  BASE_URL: getProApiBaseUrl(),
  HISTORICAL_LIQUIDITY: (token: string) => `/api/historicalLiquidity/${token}`,
} as const;

export const endpoints = {
  TVL,
  STABLECOINS,
  YIELDS,
  COINS,
  VOLUMES,
  FEES,
  BRIDGES,
  USERS,
  MAIN_PAGE,
  UNLOCKS,
  YIELDS_PRO,
  PERPS,
  ETFS,
  NARRATIVES,
  TOKEN_LIQUIDITY,
} as const;

export const API_CONFIG = {
  timeout: parseInt(process.env.API_TIMEOUT || '90000', 10), // 90s for large responses like oracles
  retryCount: parseInt(process.env.API_RETRY_COUNT || '3', 10),
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  apiKey: process.env.API_KEY || '',
};
