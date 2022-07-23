import BigNumber from "bignumber.js";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";
import {secondsBetweenCallsExtra} from '../utils/date'
import fetch from "node-fetch";

const ethereumAddress = "0x0000000000000000000000000000000000000000";
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAY = 24 * 3600;
type Balances = {
  [symbol: string]: number;
};

export default async function (balances: { [address: string]: string }, timestamp: "now" | number) {
  const eth = balances[ethereumAddress];
  if (eth !== undefined) {
    balances[weth] = new BigNumber(balances[weth] ?? 0).plus(eth).toFixed(0);
    delete balances[ethereumAddress];
  }
  const PKsToTokens = {} as { [t: string]: string[] };
  const readKeys = Object.keys(balances)
    .map((address) => {
      const PK = `${timestamp === "now"?"":"asset#"}${address.startsWith("0x") ? "ethereum:" : ""
        }${address.toLowerCase()}`;
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
  for (let i = 0; i < readKeys.length; i += 100) {
    readRequests.push(
      fetch("https://coins.llama.fi/prices", {
        method: "POST",
        body: JSON.stringify({
          "coins": readKeys.slice(i, i + 100)
        })
      }).then((r) => r.json()).then(r=>{
        return Object.entries(r.coins).map(
        ([PK, value])=>({
          ...(value as any),
          PK
        })
      )
    })
    );
  }
  let tokenData = ([] as any[]).concat(...(await Promise.all(readRequests)));
  if (timestamp !== "now") {
    const historicalPrices = await Promise.all(readKeys.map(key => getTVLOfRecordClosestToTimestamp(key, timestamp, secondsBetweenCallsExtra)))
    tokenData = historicalPrices.map(t => {
      const current = tokenData.find(current => current.PK === t.PK)
      return {
        timestamp: t.SK,
        price: t.price,
        decimals: current?.decimals,
        symbol: current?.symbol,
        PK: t.PK,
      }
    }).filter(t => t.timestamp !== undefined && t.decimals !== undefined)
  }
  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;
  const now = timestamp === "now" ? Math.round(Date.now() / 1000) : timestamp;
  tokenData.forEach((response) => {
    if (Math.abs(response.timestamp - now) < DAY) {
      PKsToTokens[response.PK].forEach((address) => {
        const balance = balances[address];
        const { price, decimals } = response;
        let symbol:string, amount:number, usdAmount:number;
        if (response.PK.includes(':')) {
          symbol = (response.symbol as string).toUpperCase();
          amount = new BigNumber(balance).div(10 ** decimals).toNumber();
          usdAmount = amount * price;
        } else {
          symbol = response.PK.slice('asset#'.length);
          amount = Number(balance);
          usdAmount = amount * price;
        }
        tokenBalances[symbol] = (tokenBalances[symbol] ?? 0) + amount;
        usdTokenBalances[symbol] = (usdTokenBalances[symbol] ?? 0) + usdAmount;
        usdTvl += usdAmount;
      });
    } else {
      console.error(`Data for ${response.PK} is stale`);
    }
  });
  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances,
  };
}
