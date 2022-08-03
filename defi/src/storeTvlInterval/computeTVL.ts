import BigNumber from "bignumber.js";
import fetch from "node-fetch";
import { addStaleCoin, StaleCoins } from "./staleCoins";

const ethereumAddress = "0x0000000000000000000000000000000000000000";
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAY = 24 * 3600;
type Balances = {
  [symbol: string]: number;
};

export default async function (balances: { [address: string]: string }, timestamp: "now" | number, staleCoins:StaleCoins) {
  const eth = balances[ethereumAddress];
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
  for (let i = 0; i < readKeys.length; i += 100) {
    const body = {
      "coins": readKeys.slice(i, i + 100),
    } as any
    if(timestamp !== "now"){
      body.timestamp = timestamp;
    }
    readRequests.push(
      fetch("https://coins.llama.fi/prices", {
        method: "POST",
        body: JSON.stringify(body)
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
  const tokenData = ([] as any[]).concat(...(await Promise.all(readRequests)));
  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;
  const now = timestamp === "now" ? Math.round(Date.now() / 1000) : timestamp;
  tokenData.forEach((response) => {
    if (Math.abs(response.timestamp - now) > 3600*1.2) { // 1.2 hours
      addStaleCoin(staleCoins, response.PK, response.symbol, response.timestamp);
    }
    if (Math.abs(response.timestamp - now) < DAY) {
      PKsToTokens[response.PK].forEach((address) => {
        const balance = balances[address];
        const { price, decimals } = response;
        let symbol:string, amount:number;
        if (response.PK.startsWith('coingecko:')) {
          symbol = address;
          amount = Number(balance);
        } else {
          symbol = (response.symbol as string).toUpperCase();
          amount = new BigNumber(balance).div(10 ** decimals).toNumber();
        }
        const usdAmount = amount * price;
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
