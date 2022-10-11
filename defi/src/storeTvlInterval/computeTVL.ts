import BigNumber from "bignumber.js";
import fetch from "node-fetch";
import { addStaleCoin, StaleCoins } from "./staleCoins";

const ethereumAddress = "0x0000000000000000000000000000000000000000";
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAY = 24 * 3600;
type Balances = {
  [symbol: string]: number;
};

const confidenceThreshold = 0.5;
const step = 50;
export default async function (balances: { [address: string]: string }, timestamp: "now" | number, staleCoins:StaleCoins) {
  staleCoins
  const eth = balances[ethereumAddress];

  Object.keys(balances).map((k) => {
    balances[k.toLowerCase()] = balances[k];
    if (k.toLowerCase() != k) delete balances[k];
  });

  if (eth !== undefined) {
    balances[weth] = new BigNumber(balances[weth] ?? 0).plus(eth).toFixed(0);
    delete balances[ethereumAddress];
  }
  const PKsToTokens = {} as { [t: string]: string[] };
  const readKeys = Object.keys(balances)
    .map((address) => {
      let prefix = "";
      if(address.startsWith("0x")){
        prefix = "ethereum:"
      } else if(!address.includes(":")){
        prefix = "coingecko:"
      }
      let normalizedAddress = address.toLowerCase()
      if(address.startsWith("solana:")){
        normalizedAddress = address
      }
      const PK = `${prefix}${normalizedAddress}`;
      if (PKsToTokens[PK] === undefined) {
        PKsToTokens[PK] = [address];
        return PK;
      } else {
        PKsToTokens[PK].push(address);
        return undefined;
      }
    })
    .filter((item) => item !== undefined) as string[];
  
  const readRequests = [];
  const burl = "https://coins.llama.fi/prices/";
  const historical =
    timestamp == "now" ? "current/" : `historical/${timestamp}/`;

  for (let i = 0; i < readKeys.length; i += step) {
    const coins = readKeys
      .slice(i, i + step)
      .reduce((p, c) => p + `${c},`, "")
      .slice(0, -1);
    readRequests.push(
      fetch(`${burl}${historical}${coins}`, { method: "GET" }).then((r) =>
        r.json()
      )
    );
  }
  
  const responses: any[] = await Promise.all(readRequests);
  let tokenData = responses.map((g) => g.coins);

  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;

  tokenData.forEach((response) => {
    Object.keys(response).forEach((address) => {
      const data = response[address];

      const balance = parseInt(
        balances[
          address.startsWith("ethereum:")
            ? address.substring(9)
            : address.startsWith("coingecko:")
            ? address.substring(10)
            : address
        ]
      );

      if (data == undefined) tokenBalances[`UNKNOWN (${address})`] = balance;
      if ("confidence" in data && data.confidence < confidenceThreshold) return;

      let amount, usdAmount;
      if (address.startsWith("coingecko:")) {
        amount = Number(balance);
      } else {
        amount = new BigNumber(balance).div(10 ** data.decimals).toNumber();
      }

      usdAmount = amount * data.price;

      tokenBalances[data.symbol] = (tokenBalances[data.symbol] ?? 0) + amount;
      usdTokenBalances[data.symbol] =
        (usdTokenBalances[data.symbol] ?? 0) + usdAmount;
      usdTvl += usdAmount;
    });
  });

  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances,
  };
}
