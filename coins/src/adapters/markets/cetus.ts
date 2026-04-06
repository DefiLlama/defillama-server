import { Write } from "../utils/dbInterfaces";
import { getTokenAndRedirectDataMap } from "../utils/database";
import axios from "axios";
import getWrites from "../utils/getWrites";

export function cetus(timestamp: number) {
  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");

  return getTokenPrices(timestamp)
}

const chain = "sui";

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const tokens: {
    price: number;
    decimals: number;
    symbol: string;
    tvl: number;
    underlying: string;
    address: string;
  }[] = [];

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
    const pools = data.lp_list ?? [];
    if (pools.length === 0) break;

    for (const pool of pools) {
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
    }

    offset += limit;
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
