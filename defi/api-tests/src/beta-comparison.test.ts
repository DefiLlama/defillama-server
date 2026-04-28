/**
 * Beta vs Pro API Comparison Tests
 *
 * When BETA_PRO_API_URL is set, compares responses from the pro endpoint
 * against the beta endpoint for every route. Both share the same DB, so
 * responses should be identical (within a small numeric tolerance).
 *
 * Usage:
 *   BETA_PRO_API_URL=https://beta-pro-api.llama.fi npx jest beta-comparison
 */

import { createApiClient, ApiClient } from '../utils/config/apiClient';

const PRO_API_KEY = process.env.PRO_API_KEY || 'api-key';
const BETA_PRO_API_URL = process.env.BETA_PRO_API_URL;
const PRO_API_URL = 'https://pro-api.llama.fi';
const TOLERANCE = 0.02; // 2% numeric tolerance

function proBase() {
  return `${PRO_API_URL}/${PRO_API_KEY}`;
}

function betaBase() {
  const base = BETA_PRO_API_URL!.replace(/\/$/, '');
  if (base.includes('/api-key/')) return base;
  return `${base}/${PRO_API_KEY}`;
}

// ── Deep comparison ────────────────────────────────────────────────────

function deepCompare(
  prod: any,
  beta: any,
  path: string,
  diffs: string[],
  maxDiffs: number = 20
): void {
  if (diffs.length >= maxDiffs) return;

  if (prod === beta) return;

  if (prod == null || beta == null) {
    if (prod !== beta) diffs.push(`${path}: prod=${JSON.stringify(prod)}, beta=${JSON.stringify(beta)}`);
    return;
  }

  if (typeof prod === 'number' && typeof beta === 'number') {
    if (prod === 0 && beta === 0) return;
    const denom = Math.max(Math.abs(prod), Math.abs(beta), 1e-12);
    const relDiff = Math.abs(prod - beta) / denom;
    if (relDiff > TOLERANCE) {
      diffs.push(`${path}: prod=${prod}, beta=${beta} (diff ${(relDiff * 100).toFixed(2)}%)`);
    }
    return;
  }

  if (typeof prod !== typeof beta) {
    diffs.push(`${path}: type mismatch prod=${typeof prod}, beta=${typeof beta}`);
    return;
  }

  if (Array.isArray(prod) && Array.isArray(beta)) {
    if (prod.length !== beta.length) {
      diffs.push(`${path}: array length prod=${prod.length}, beta=${beta.length}`);
    }
    const len = Math.min(prod.length, beta.length, 50); // cap iteration
    for (let i = 0; i < len; i++) {
      deepCompare(prod[i], beta[i], `${path}[${i}]`, diffs, maxDiffs);
    }
    return;
  }

  if (typeof prod === 'object') {
    const allKeys = new Set([...Object.keys(prod), ...Object.keys(beta)]);
    for (const key of allKeys) {
      if (diffs.length >= maxDiffs) return;
      if (!(key in prod)) {
        diffs.push(`${path}.${key}: missing in prod`);
      } else if (!(key in beta)) {
        diffs.push(`${path}.${key}: missing in beta`);
      } else {
        deepCompare(prod[key], beta[key], `${path}.${key}`, diffs, maxDiffs);
      }
    }
    return;
  }

  if (prod !== beta) {
    diffs.push(`${path}: prod=${JSON.stringify(prod)}, beta=${JSON.stringify(beta)}`);
  }
}

// ── Endpoint definitions ───────────────────────────────────────────────

interface TestEndpoint {
  name: string;
  /** Path relative to the pro base URL (e.g. "/stablecoins/stablecoins") */
  path: string;
  /** POST body, if the endpoint requires one */
  body?: any;
  method?: 'GET' | 'POST';
}

const NOW_TS = Math.floor(Date.now() / 1000);

const endpoints: TestEndpoint[] = [
  // ── TVL (free) ───────────────────────────────────────────────────────
  // { name: 'protocols', path: '/api/protocols' },
  { name: 'protocol aave', path: '/api/protocol/aave' },
  { name: 'charts', path: '/api/charts' },
  { name: 'charts ethereum', path: '/api/charts/Ethereum' },
  // { name: 'tvl aave', path: '/api/tvl/aave' },
  // { name: 'historicalChainTvl', path: '/api/v2/historicalChainTvl' },
  // { name: 'historicalChainTvl ethereum', path: '/api/v2/historicalChainTvl/Ethereum' },
  // { name: 'chains v2', path: '/api/v2/chains' },

  // ── TVL (pro) ────────────────────────────────────────────────────────
  { name: 'chainAssets', path: '/api/chainAssets' },
  { name: 'tokenProtocols ETH', path: '/api/tokenProtocols/ETH' },

  // ── Stablecoins ──────────────────────────────────────────────────────
  { name: 'stablecoins list', path: '/stablecoins/stablecoins' },
  { name: 'stablecoin chains', path: '/stablecoins/stablecoinchains' },
  { name: 'stablecoin prices', path: '/stablecoins/stablecoinprices' },
  { name: 'stablecoin charts all', path: '/stablecoins/stablecoincharts/all' },
  { name: 'stablecoin charts ethereum', path: '/stablecoins/stablecoincharts/Ethereum' },
  { name: 'stablecoin 1 (tether)', path: '/stablecoins/stablecoin/1' },
  { name: 'stablecoin dominance ethereum', path: '/stablecoins/stablecoindominance/Ethereum' },

  // ── Coins: prices current ─────────────────────────────────────────────
  { name: 'prices current mixed', path: '/coins/prices/current/coingecko:bitcoin,coingecko:ethereum,ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { name: 'prices current stablecoins', path: '/coins/prices/current/ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7,ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { name: 'prices current bsc', path: '/coins/prices/current/bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c,bsc:0x2170Ed0880ac9A755fd29B2688956BD959F933F8,bsc:0x55d398326f99059fF775485246999027B3197955' },
  { name: 'prices current polygon', path: '/coins/prices/current/polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  { name: 'prices current arbitrum', path: '/coins/prices/current/arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,arbitrum:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,arbitrum:0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { name: 'prices current avax', path: '/coins/prices/current/avax:0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7,avax:0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' },
  { name: 'prices current optimism', path: '/coins/prices/current/optimism:0x4200000000000000000000000000000000000006,optimism:0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  { name: 'prices current solana', path: '/coins/prices/current/solana:So11111111111111111111111111111111111111112,solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { name: 'prices current coingecko top10', path: '/coins/prices/current/coingecko:bitcoin,coingecko:ethereum,coingecko:tether,coingecko:binancecoin,coingecko:solana,coingecko:ripple,coingecko:usd-coin,coingecko:cardano,coingecko:avalanche-2,coingecko:dogecoin' },

  // ── Coins: prices historical ────────────────────────────────────────
  { name: 'prices historical 1d', path: `/coins/prices/historical/${NOW_TS - 86400}/coingecko:bitcoin,coingecko:ethereum` },
  { name: 'prices historical 7d', path: `/coins/prices/historical/${NOW_TS - 86400 * 7}/coingecko:bitcoin,ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` },
  { name: 'prices historical 30d', path: `/coins/prices/historical/${NOW_TS - 86400 * 30}/coingecko:bitcoin,coingecko:ethereum,bsc:0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` },
  { name: 'prices historical 1y', path: `/coins/prices/historical/${NOW_TS - 86400 * 365}/coingecko:bitcoin,coingecko:ethereum` },

  // ── Coins: chart ────────────────────────────────────────────────────
  { name: 'chart btc', path: '/coins/chart/coingecko:bitcoin' },
  { name: 'chart eth', path: '/coins/chart/coingecko:ethereum' },
  { name: 'chart weth', path: '/coins/chart/ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },

  // ── Coins: percentage ───────────────────────────────────────────────
  { name: 'percentage btc eth', path: '/coins/percentage/coingecko:bitcoin,coingecko:ethereum' },
  { name: 'percentage stablecoins', path: '/coins/percentage/ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7,ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },

  // ── Coins: prices first ─────────────────────────────────────────────
  { name: 'prices first btc', path: '/coins/prices/first/coingecko:bitcoin' },
  { name: 'prices first eth', path: '/coins/prices/first/coingecko:ethereum' },
  { name: 'prices first weth', path: '/coins/prices/first/ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },

  // ── Coins: block ────────────────────────────────────────────────────
  { name: 'block ethereum', path: `/coins/block/ethereum/${NOW_TS - 3600}` },
  { name: 'block bsc', path: `/coins/block/bsc/${NOW_TS - 3600}` },
  { name: 'block polygon', path: `/coins/block/polygon/${NOW_TS - 3600}` },
  { name: 'block arbitrum', path: `/coins/block/arbitrum/${NOW_TS - 3600}` },

  // ── Yields (free) ────────────────────────────────────────────────────
  { name: 'yields pools', path: '/yields/pools' },

  // ── Yields (pro) ─────────────────────────────────────────────────────
  { name: 'yields poolsOld', path: '/yields/poolsOld' },
  { name: 'yields poolsBorrow', path: '/yields/poolsBorrow' },
  { name: 'yields perps', path: '/yields/perps' },
  { name: 'yields lsdRates', path: '/yields/lsdRates' },

  // ── Volumes ──────────────────────────────────────────────────────────
  { name: 'overview dexs', path: '/api/overview/dexs' },
  { name: 'overview dexs ethereum', path: '/api/overview/dexs/Ethereum' },
  { name: 'summary dexs uniswap', path: '/api/summary/dexs/uniswap' },
  { name: 'overview options', path: '/api/overview/options' },
  { name: 'overview options ethereum', path: '/api/overview/options/Ethereum' },

  // ── Fees ─────────────────────────────────────────────────────────────
  { name: 'overview fees', path: '/api/overview/fees' },
  { name: 'overview fees ethereum', path: '/api/overview/fees/Ethereum' },
  { name: 'summary fees aave', path: '/api/summary/fees/aave' },

  // ── Main page / Protocol Analytics ───────────────────────────────────
  { name: 'categories', path: '/api/categories' },
  { name: 'forks', path: '/api/forks' },
  { name: 'oracles', path: '/api/oracles' },
  { name: 'hacks', path: '/api/hacks' },
  { name: 'raises', path: '/api/raises' },
  { name: 'entities', path: '/api/entities' },

  // ── Perps ────────────────────────────────────────────────────────────
  { name: 'overview derivatives', path: '/api/overview/derivatives' },
  { name: 'overview open-interest', path: '/api/overview/open-interest' },
  { name: 'summary derivatives gmx', path: '/api/summary/derivatives/gmx' },

  // ── ETFs ─────────────────────────────────────────────────────────────
  { name: 'etfs snapshot', path: '/etfs/snapshot' },
  { name: 'etfs flows', path: '/etfs/flows' },

  // ── Emissions / Unlocks ──────────────────────────────────────────────
  { name: 'emissions', path: '/api/emissions' },
  { name: 'emission uniswap', path: '/api/emission/uniswap' },

  // ── RWA ──────────────────────────────────────────────────────────────
  { name: 'rwa current', path: '/rwa/current' },
  { name: 'rwa list', path: '/rwa/list' },
  { name: 'rwa stats', path: '/rwa/stats' },

  // ── Digital Asset Treasury ───────────────────────────────────────────
  { name: 'dat institutions', path: '/dat/institutions' },
  // { name: 'dat institutions MSTR', path: '/dat/institutions/MSTR' },

  // ── Equities ─────────────────────────────────────────────────────────
  // { name: 'equities companies', path: '/equities/v1/companies' },
  // { name: 'equities summary', path: '/equities/v1/summary?ticker=NVDA' },
];

// ── Tests ──────────────────────────────────────────────────────────────

const shouldRun = !!BETA_PRO_API_URL;

const describeOrSkip = shouldRun ? describe : describe.skip;
console.log(proBase(), betaBase());

describeOrSkip('Beta vs Pro API Comparison', () => {
  let proClient: ApiClient;
  let betaClient: ApiClient;

  beforeAll(() => {
    proClient = createApiClient(proBase());
    betaClient = createApiClient(betaBase());
  });

  // afterEach(() => new Promise((r) => setTimeout(r, 200)));

  endpoints.forEach((ep) => {
    it(`${ep.name} — ${ep.path}`, async () => {
      const method = ep.method ?? 'GET';
      const doFetch = (client: ApiClient) =>
        method === 'POST' ? client.post(ep.path, ep.body) : client.get(ep.path);



      const [proRes, betaRes] = await Promise.all([doFetch(proClient), doFetch(betaClient)]);

      // Both should return 200
      expect(proRes.status).toBe(200);
      expect(betaRes.status).toBe(200);

      // Deep compare
      const diffs: string[] = [];
      const proHash = Buffer.from(JSON.stringify(proRes.data)).toString('base64');
      const betaHash = Buffer.from(JSON.stringify(betaRes.data)).toString('base64');

      if (proHash !== betaHash)
        deepCompare(proRes.data, betaRes.data, '$', diffs);

      if (diffs.length > 0) {
        console.log(`\n[${ep.name}] ${diffs.length} difference(s):`);
        diffs.slice(0, 10).forEach((d) => console.log(`  • ${d}`));
        if (diffs.length > 10) console.log(`  ... and ${diffs.length - 10} more`);
      }

      expect(diffs).toEqual([]);
    }, 60000);
  });
});
