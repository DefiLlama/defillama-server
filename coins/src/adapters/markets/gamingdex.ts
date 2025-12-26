import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

const CHAIN = 'oasys';
const TOKENS = [{
  address: '0xbb5e4922061D5347eAe47f0A8BCbbCADEA5480A5',
  symbol: 'MUSHI',
  decimals: 18,
}, {
  address: '0xd11E0F63B04868567c297A3119e491707DB19E4e',
  symbol: 'MSM',
  decimals: 18,
}]

export function gamingdex(timestamp: number) {
  return Promise.all([
    getTokenPrices(timestamp),
  ])
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];

  const tokenAddrsLower = TOKENS.map((t) => t.address.toLowerCase());
  const addrParam = tokenAddrsLower.join(",");
  const url =
    `https://api.geckoterminal.com/api/v2/simple/networks/${CHAIN}/token_price/${addrParam}` +
    `?include_market_cap=false` +
    `&mcap_fdv_fallback=false` +
    `&include_24hr_vol=false` +
    `&include_24hr_price_change=false` +
    `&include_total_reserve_in_usd=false` +
    `&include_inactive_source=false`;

  let coinPrices: any;
  try {
    const resp = await axios.get(url, { timeout: 20_000 });
    coinPrices = resp.data;
  } catch (e) {
    return writes;
  }

  const tokenPrices = coinPrices?.data?.attributes?.token_prices;

  if (!tokenPrices) return writes;

  for (let token of TOKENS) {
    const price = tokenPrices[token.address.toLowerCase()];
    if (!price) continue;
    addToDBWritesList(
      writes,
      CHAIN,
      token.address,
      price,
      token.decimals,
      token.symbol,
      timestamp,
      'gamingdex',
      0.9,
    );
  }

  return writes
}
