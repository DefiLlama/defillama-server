import BigNumber from "bignumber.js";
import fetch from "node-fetch";
import { sumSingleBalance } from "@defillama/sdk/build/generalUtil";
//import { normalizeBalances } from "@defillama/sdk/build/util/index";
import { addStaleCoin, StaleCoins } from "./staleCoins";
import { call } from "@defillama/sdk/build/abi";
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

async function addToStaleCoins(staleCoins: StaleCoins, tokenId: string) {
  const chain: any = tokenId.substring(0, tokenId.indexOf(":"));
  const target: string = tokenId.substring(tokenId.indexOf(":") + 1);
  let decimals: number = 0;
  let symbol: string;
  try {
    [{ output: decimals }, { output: symbol }] = await Promise.all([
      call({ target, abi: "erc20:decimals", chain }),
      call({ target, abi: "erc20:symbol", chain })
    ]);
  } catch {
    decimals = 0;
    symbol = "NA";
  }
  addStaleCoin(staleCoins, tokenId, symbol, decimals);
}

const confidenceThreshold = 0.5;
const step = 40;
export default async function (
  balances: { [address: string]: string },
  timestamp: "now" | number,
  staleCoins: StaleCoins
) {
  const rawTokenBalances = {} as Balances;
  const normalBalances = normalizeBalances(balances);
  const tokenData = await fetchTokenData(timestamp, balances);
  const staleCoinPromises: Promise<void>[] = [];

  Object.keys(balances).map((key: string) => {
    sumSingleBalance(rawTokenBalances, key, balances[key]);
    tokenData.forEach((response) => {
      if (key in response) return;
      staleCoinPromises.push(addToStaleCoins(staleCoins, key));
    });
  });

  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;

  tokenData.forEach((response) => {
    Object.keys(response).forEach((address) => {
      const data = response[address];
      const balance: BigNumber = new BigNumber(normalBalances[address]);

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

  await Promise.all(staleCoinPromises);
  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances,
    rawTokenBalances
  };
}
