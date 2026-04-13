import { getTokenAndRedirectDataMap } from "../utils/database";
import axios from "axios";
import getWrites from "../utils/getWrites";

export function cetus(timestamp: number) {
  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");

  return getTokenPrices(timestamp);
}

const chain = "sui";

interface TokenEntry {
  price: number;
  decimals: number;
  symbol: string;
  tvl: number;
  underlying: string;
  address: string;
}

async function paginateV2() {
  const pools: any[] = [];
  const limit = 100;
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const {
      data: { data },
    } = await axios.get(`https://api-sui.cetus.zone/v2/sui/stats_pools`, {
      params: {
        is_vaults: false,
        display_all_pools: true,
        has_mining: true,
        has_farming: true,
        no_incentives: true,
        order_by: "-tvl",
        limit,
        offset,
      },
    });
    total = data.total;
    const list = data.lp_list ?? [];
    if (list.length === 0) break;
    pools.push(...list);
    offset += limit;
  }

  return pools;
}

async function paginateV3() {
  const pools: any[] = [];
  const limit = 100;
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const {
      data: { data },
    } = await axios.get(
      `https://api-sui.cetus.zone/v3/sui/clmm/stats_pools`,
      { params: { limit, offset } },
    );
    total = data.total;
    const list = data.list ?? [];
    if (list.length === 0) break;
    pools.push(...list);
    offset += limit;
  }

  return pools;
}

async function getTokenPrices(timestamp: number) {
  const tokens: TokenEntry[] = [];

  const [v2Pools, v3Pools] = await Promise.all([
    paginateV2(),
    paginateV3(),
  ]);

  // Build sqrt-price map from v2 (v3 does not expose current_sqrt_price)
  const sqrtPriceMap: Record<string, number> = {};
  for (const pool of v2Pools) {
    const sp = +(pool.object?.current_sqrt_price ?? 0);
    if (sp !== 0 && pool.address) sqrtPriceMap[pool.address] = sp;
  }

  // --- Process v2 pools ---
  const seenPools = new Set<string>();
  for (const pool of v2Pools) {
    const poolTvl = +pool.pure_tvl_in_usd || 0;
    const poolVolume = +pool.vol_in_usd_24h || 0;
    if (poolTvl < 10_000 || poolVolume < 1_000) continue;

    const sqrtPrice = +(pool.object?.current_sqrt_price ?? 0);
    if (sqrtPrice === 0) continue;
    const decA = +(pool.coin_a?.decimals ?? 0);
    const decB = +(pool.coin_b?.decimals ?? 0);
    // price of coin_a in terms of coin_b: (sqrtPrice / 2^64)^2 * 10^(decA - decB)
    const rawPrice = sqrtPrice / 2 ** 64;
    const priceAinB = rawPrice * rawPrice * 10 ** (decA - decB);

    for (const side of ["coin_a", "coin_b"]) {
      const coin = pool[side];
      const otherCoin = pool[side === "coin_a" ? "coin_b" : "coin_a"];
      if (!coin?.address || !otherCoin?.address) continue;
      const price = side === "coin_a" ? priceAinB : 1 / priceAinB;
      tokens.push({
        address: coin.address,
        price,
        decimals: +coin.decimals,
        symbol: coin.symbol,
        tvl: poolTvl,
        underlying: otherCoin.address,
      });
    }

    if (pool.address) seenPools.add(pool.address);
  }

  // --- Process v3 CLMM pools not already covered by v2 ---
  for (const pool of v3Pools) {
    if (seenPools.has(pool.pool)) continue;

    const poolTvl = +(pool.tvl ?? 0);
    const vol24h = +(
      pool.stats?.find((s: any) => s.dateType === "24H")?.vol ?? 0
    );

    const coinA = pool.coinA;
    const coinB = pool.coinB;
    if (!coinA?.coinType || !coinB?.coinType) continue;

    const exceptions = ['enzoBTC']

    if (poolTvl < 10_000 || vol24h < 1_000 && (!exceptions.includes(coinA.symbol) && !exceptions.includes(coinB.symbol))) continue;

    const sqrtPrice = sqrtPriceMap[pool.pool];
    if (!sqrtPrice) continue;

    const decA = +(pool.coinA?.decimals ?? 0);
    const decB = +(pool.coinB?.decimals ?? 0);
    const rawPrice = sqrtPrice / 2 ** 64;
    const priceAinB = rawPrice * rawPrice * 10 ** (decA - decB);

    tokens.push({
      address: coinA.coinType,
      price: priceAinB,
      decimals: decA,
      symbol: coinA.symbol,
      tvl: poolTvl,
      underlying: coinB.coinType,
    });
    tokens.push({
      address: coinB.coinType,
      price: 1 / priceAinB,
      decimals: decB,
      symbol: coinB.symbol,
      tvl: poolTvl,
      underlying: coinA.coinType,
    });
  }

  const underlyingTokens = await getTokenAndRedirectDataMap(
    [...new Set(tokens.map((i) => i.underlying))],
    chain,
    timestamp,
  );

  const pricesObject: any = {};
  for (const { price, decimals, symbol, tvl, underlying, address } of tokens) {
    if (!underlyingTokens[underlying.toLowerCase()]) continue;
    if (pricesObject[address] && pricesObject[address].tvl > tvl) continue;
    pricesObject[address] = {
      price,
      underlying,
      decimals,
      symbol,
      tvl,
    };
  }

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "cetus",
    confidence: 0.8,
  });
}
