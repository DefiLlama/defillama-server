import BigNumber from "bignumber.js";
import fetch from "node-fetch";
import { sumSingleBalance } from "@defillama/sdk/build/generalUtil";
import { addStaleCoin, StaleCoins } from "./staleCoins";
const ethereumAddress = "0x0000000000000000000000000000000000000000";
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

type Balances = {
  [symbol: string]: number;
};

function normalizeBalances(balances: { [address: string]: string }) {
  Object.keys(balances).map((key) => {
    if (+balances[key] === 0) {
      delete balances[key];
      return;
    }

    const normalisedKey = key.startsWith("0x")
      ? `ethereum:${key.toLowerCase()}`
      : !key.includes(":")
      ? `coingecko:${key.toLowerCase()}`
      : key.toLowerCase();

    // sol amd tezos case sensitive so no normalising
    if (
      key == normalisedKey ||
      key.startsWith("solana:") ||
      key.startsWith("tezos:")
    )
      return;

    sumSingleBalance(balances, normalisedKey, balances[key]);
    delete balances[key];
  });

  const eth = balances[ethereumAddress];
  if (eth !== undefined) {
    balances[weth] = new BigNumber(balances[weth] ?? 0).plus(eth).toFixed(0);
    delete balances[ethereumAddress];
  }

  return balances;
}

async function fetchTokenData(
  timestamp: "now" | number,
  balances: { [address: string]: string }
) {
  const readRequests = [];
  const burl = "https://coins.llama.fi/prices/";
  const historical =
    timestamp == "now" ? "current/" : `historical/${timestamp}/`;

  for (let i = 0; i < Object.keys(balances).length; i += step) {
    const coins = Object.keys(balances)
      .slice(i, i + step)
      .join(",");
    readRequests.push(
      fetch(`${burl}${historical}${coins}`, { method: "GET" }).then((r) =>
        r.json()
      )
    );
  }

  const responses: any[] = await Promise.all(readRequests);
  return responses.map((g) => g.coins);
}

const confidenceThreshold = 0.5;
const step = 40;
export default async function (
  balances: { [address: string]: string },
  timestamp: "now" | number,
  staleCoins: StaleCoins
) {
  balances = normalizeBalances(balances);

  const tokenData = await fetchTokenData(timestamp, balances);
  Object.keys(balances).map((key: string) => {
    tokenData.forEach((response) => {
      if (key in response) return
      // need to fix these final params
      // whats the best way to fetch symbol, timestamp - is there a better option 
      addStaleCoin(staleCoins, key, 'TBC', 0); 
    })
  })

  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;

  tokenData.forEach((response) => {
    Object.keys(response).forEach((address) => {
      const data = response[address];
      const balance: BigNumber = new BigNumber(balances[address]);

      if ("confidence" in data && data.confidence < confidenceThreshold) return;

      const amount: BigNumber = address.startsWith("coingecko:")
        ? balance
        : balance.div(10 ** data.decimals);
      const usdAmount: BigNumber = amount.times(data.price);

      tokenBalances[data.symbol] =
        (tokenBalances[data.symbol] ?? 0) + amount.toNumber();
      usdTokenBalances[data.symbol] =
        (usdTokenBalances[data.symbol] ?? 0) + usdAmount.toNumber();
      usdTvl += usdAmount.toNumber();
    });
  });

  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances
  };
}
