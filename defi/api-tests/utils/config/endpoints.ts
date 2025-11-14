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

export const BASE_URLS = {
  TVL: getBaseUrl(process.env.BETA_API_URL || process.env.BASE_API_URL || 'https://api.llama.fi', 'tvl'),
  COINS: getBaseUrl(process.env.BETA_COINS_URL || 'https://coins.llama.fi', 'coins'),
  STABLECOINS: getBaseUrl(process.env.BETA_STABLECOINS_URL || 'https://stablecoins.llama.fi', 'stablecoins'),
  YIELDS: getBaseUrl(process.env.BETA_YIELDS_URL || 'https://yields.llama.fi', 'yields'),
  BRIDGES: getBaseUrl(process.env.BETA_BRIDGES_URL || 'https://bridges.llama.fi', 'bridges'),
  VOLUMES: getBaseUrl(process.env.BETA_API_URL || 'https://api.llama.fi', 'volumes'),
  FEES: getBaseUrl(process.env.BETA_API_URL || 'https://api.llama.fi', 'fees'),
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
  LIST: getEndpoint('/stablecoins', true),
  CHAINS: getEndpoint('/stablecoinchains', true),
  PRICES: getEndpoint('/stablecoinprices', true),
  CHARTS_ALL: getEndpoint('/stablecoincharts/all', true),
  CHARTS_BY_CHAIN: (chain: string) => getEndpoint(`/stablecoincharts/${chain}`, true),
  ASSET: (asset: string) => getEndpoint(`/stablecoin/${asset}`, true),
  DOMINANCE: (chain: string) => getEndpoint(`/stablecoindominance/${chain}`, false),
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
} as const;

export const VOLUMES = {
  BASE_URL: BASE_URLS.VOLUMES,
  OVERVIEW: (type: string) => `/overview/${type}`,
  SUMMARY: (type: string, protocol: string) => `/summary/${type}/${protocol}`,
} as const;

export const FEES = {
  BASE_URL: BASE_URLS.FEES,
  OVERVIEW: (type: string) => `/overview/${type}`,
  SUMMARY: (type: string, protocol: string) => `/summary/${type}/${protocol}`,
} as const;

export const BRIDGES = {
  BASE_URL: BASE_URLS.BRIDGES,
  BRIDGES: '/bridges',
  BRIDGE: (bridge: string) => `/bridge/${bridge}`,
} as const;

export const endpoints = {
  TVL,
  STABLECOINS,
  YIELDS,
  COINS,
  VOLUMES,
  FEES,
  BRIDGES,
} as const;

export const API_CONFIG = {
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  retryCount: parseInt(process.env.API_RETRY_COUNT || '3', 10),
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  apiKey: process.env.API_KEY || '',
};
