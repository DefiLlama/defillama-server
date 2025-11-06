import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export enum ApiCategory {
  TVL = 'TVL',
  COINS = 'COINS',
  STABLECOINS = 'STABLECOINS',
  YIELDS = 'YIELDS',
  BRIDGES = 'BRIDGES',
  VOLUMES = 'VOLUMES',
  FEES = 'FEES',
}

export const BASE_URLS = {
  TVL: process.env.BETA_API_URL || process.env.BASE_API_URL || 'https://api.llama.fi',
  COINS: process.env.BETA_COINS_URL || 'https://coins.llama.fi',
  STABLECOINS: process.env.BETA_STABLECOINS_URL || 'https://stablecoins.llama.fi',
  YIELDS: process.env.BETA_YIELDS_URL || 'https://yields.llama.fi',
  BRIDGES: process.env.BETA_BRIDGES_URL || 'https://bridges.llama.fi',
  VOLUMES: process.env.BETA_API_URL || 'https://api.llama.fi',
  FEES: process.env.BETA_API_URL || 'https://api.llama.fi',
  PRO: process.env.BETA_PRO_API_URL || 'https://pro-api.llama.fi',
};

export const TVL_ENDPOINTS = {
  BASE_URL: BASE_URLS.TVL,
  PROTOCOLS: '/protocols',
  PROTOCOL: (protocol: string) => `/protocol/${protocol}`,
  CHARTS: (chain?: string) => chain ? `/charts/${chain}` : '/charts',
  TVL: (protocol: string) => `/tvl/${protocol}`,
  HISTORICAL_CHAIN_TVL: (chain: string) => `/v2/historicalChainTvl/${chain}`,
} as const;

export const STABLECOINS_ENDPOINTS = {
  BASE_URL: BASE_URLS.STABLECOINS,
  STABLECOINS: '/stablecoins',
  STABLECOIN_CHAINS: '/stablecoinchains',
  STABLECOIN_CHART: (chain?: string) => chain ? `/stablecoincharts/${chain}` : '/stablecoincharts/all',
} as const;

export const YIELDS_ENDPOINTS = {
  BASE_URL: BASE_URLS.YIELDS,
  POOLS: '/pools',
  CHART: (pool: string) => `/chart/${pool}`,
} as const;

export const COINS_ENDPOINTS = {
  BASE_URL: BASE_URLS.COINS,
  PRICES_CURRENT: (coins: string) => `/prices/current/${coins}`,
  PRICES_HISTORICAL: (timestamp: number, coins: string) => `/prices/historical/${timestamp}/${coins}`,
  CHART: (coins: string) => `/chart/${coins}`,
} as const;

export const VOLUMES_ENDPOINTS = {
  BASE_URL: BASE_URLS.VOLUMES,
  OVERVIEW: (type: string) => `/overview/${type}`,
  SUMMARY: (type: string, protocol: string) => `/summary/${type}/${protocol}`,
} as const;

export const FEES_ENDPOINTS = {
  BASE_URL: BASE_URLS.FEES,
  OVERVIEW: (type: string) => `/overview/${type}`,
  SUMMARY: (type: string, protocol: string) => `/summary/${type}/${protocol}`,
} as const;

export const BRIDGES_ENDPOINTS = {
  BASE_URL: BASE_URLS.BRIDGES,
  BRIDGES: '/bridges',
  BRIDGE: (bridge: string) => `/bridge/${bridge}`,
} as const;

export const API_CONFIG = {
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  retryCount: parseInt(process.env.API_RETRY_COUNT || '3', 10),
  retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  apiKey: process.env.API_KEY || '',
};

