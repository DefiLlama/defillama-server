import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import axios from "axios";

const chain = "sui";
const volumeThreshold = 1e5;
const tvlThreshold = 1e6;

type Token = {
  address: string;
  symbol: string;
  decimals: number;
  info?: {
    address: string;
    decimals: number;
    symbol: string;
  };
};
type Pool = {
  address?: string;
  day?: {
    volume: number;
  };
  tvl?: number;
  tokenA: Token;
  tokenB: Token;
  price: number;
};

export async function bluefin(timestamp: number) {
  if (timestamp !== 0) throw new Error("Can't fetch historical data");

  const writes: Write[] = [];
  const { data } = await axios.get(
    "https://swap.api.sui-prod.bluefin.io/api/v1/pools/info",
  );

  const tokenQueries: string[] = [];
  const poolTokens: {
    [pool: string]: { tokenA: Token; tokenB: Token; price: number };
  } = {};
  data.forEach(({ address, day, tvl, tokenA, tokenB, price }: Pool) => {
    if (!address || !day?.volume || !tvl || !tokenA.info || !tokenB.info)
      return;
    if (day.volume < volumeThreshold || (tvl && tvl < tvlThreshold)) return;
    poolTokens[address] = {
      tokenA: tokenA.info,
      tokenB: tokenB.info,
      price,
    };
    tokenQueries.push(...[tokenA.info.address, tokenB.info.address]);
  });

  const knownTokens = await getTokenAndRedirectData(
    tokenQueries,
    chain,
    timestamp,
  );

  const knownTokenPrices: { [token: string]: number } = {};
  knownTokens.map((token) => {
    knownTokenPrices[token.address] = token.price;
  });

  for (let i = 0; i < 2; i++) deduceMissingPrices(poolTokens, knownTokenPrices);

  Object.values(poolTokens).map(({ tokenA, tokenB }: Pool) => {
    if (knownTokenPrices[tokenA.address]) writeToken(tokenA);
    if (knownTokenPrices[tokenB.address]) writeToken(tokenB);
  });

  function deduceMissingPrices(
    poolTokens: {
      [pool: string]: { tokenA: Token; tokenB: Token; price: number };
    },
    knownTokenPrices: { [token: string]: number },
  ) {
    for (const pool in poolTokens) {
      const { tokenA, tokenB, price } = poolTokens[pool];
      const tokenAAddress = tokenA.address.toLowerCase();
      const tokenBAddress = tokenB.address.toLowerCase();

      const tokenAPrice = knownTokenPrices[tokenAAddress];
      const tokenBPrice = knownTokenPrices[tokenBAddress];

      if (tokenAPrice && !tokenBPrice)
        knownTokenPrices[tokenBAddress] = tokenAPrice / price;
      else if (tokenBPrice && !tokenAPrice)
        knownTokenPrices[tokenAAddress] = price * tokenBPrice;
    }
  }

  function writeToken(token: Token) {
    addToDBWritesList(
      writes,
      chain,
      token.address,
      knownTokenPrices[token.address],
      token.decimals,
      token.symbol,
      timestamp,
      "bluefin",
      0.8,
    );
  }

  return writes;
}

bluefin(0); // ts-node coins/src/adapters/markets/bluefin.ts
