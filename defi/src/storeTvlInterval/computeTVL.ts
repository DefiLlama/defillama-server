import BigNumber from "bignumber.js";
import fetch from "node-fetch";
import { appendToStaleCoins, checkForStaleness, StaleCoins } from "./staleCoins";
import * as sdk from '@defillama/sdk'
import { once, EventEmitter } from 'events'
import { searchWidth } from "../utils/shared/constants";

const ethereumAddress = "0x0000000000000000000000000000000000000000";
const weth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

type Balances = {
  [symbol: string]: number;
};

export default async function (balances: { [address: string]: string }, timestamp: "now" | number, protocol: string, staleCoins: StaleCoins) {
  replaceETHwithWETH(balances)

  const PKsToTokens = {} as { [t: string]: string[] };
  const readKeys = Object.keys(balances)
    .map((address) => {
      if (+balances[address] === 0) return undefined;
      let prefix = "";
      if (address.startsWith("0x")) {
        prefix = "ethereum:"
      } else if (!address.includes(":")) {
        prefix = "coingecko:"
      }
      let normalizedAddress = address.toLowerCase()
      if (address.startsWith("solana:")) {
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
  let usdTvl = 0;
  const tokenBalances = {} as Balances;
  const usdTokenBalances = {} as Balances;
  const now = timestamp === "now" ? Math.round(Date.now() / 1000) : timestamp;
  const tokenData = await getTokenData(readKeys, timestamp)
  const staleCoinsInclusive: any = {};
  tokenData.forEach((response: any) => {
    if (Math.abs(response.timestamp - now) < searchWidth) {
      PKsToTokens[response.PK].forEach((address) => {
        const balance = balances[address];
        const { price, decimals } = response;
        if (!price) return;
        let symbol: string, amount: number;
        if (response.PK.startsWith('coingecko:')) {
          symbol = address;
          amount = Number(balance);
        } else {
          symbol = (response.symbol as string).toUpperCase();
          amount = new BigNumber(balance).div(10 ** decimals).toNumber();
        }
        const usdAmount = amount * price;
        checkForStaleness(usdAmount, response, now, protocol, staleCoinsInclusive);
        tokenBalances[symbol] = (tokenBalances[symbol] ?? 0) + amount;
        usdTokenBalances[symbol] = (usdTokenBalances[symbol] ?? 0) + usdAmount;
        usdTvl += usdAmount;
      });
    }
  });

  appendToStaleCoins(usdTvl, staleCoinsInclusive, staleCoins);

  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances,
  };
}

function replaceETHwithWETH(balances: { [address: string]: string }) {
  const keys = [ethereumAddress, 'ethereum:' + ethereumAddress]
  for (const key of keys) {
    if (balances[key]) {
      sdk.util.sumSingleBalance(balances, weth, balances[key])
      delete balances[key]
    }
  }
}

const maxParallelCalls = +(process.env.PRICE_CACHE_MAX_PARALLEL_CALLS ?? 11)

const counter: Counter = {
  activeWorkers: 0,
  queue: [],
  requestCount: 0,
  pickFromTop: true,
}

const emitter = new EventEmitter()
emitter.setMaxListeners(500000)

const priceCache: { [PK: string]: any } = {
  "coingecko:tether": {
    price: 1,
    symbol: "USDT",
    timestamp: Math.floor(Date.now() / 1e3 + 3600) // an hour from script start time
  }
}

export function clearPriceCache() {
  for (const key of Object.keys(priceCache)) {
    if (key !== "coingecko:tether")
      delete priceCache[key]
  }
}

// setInterval(clearPriceCache, 1000 * 60 * 15)

async function getTokenData(readKeys: string[], timestamp: string | number): Promise<any> {
  if (!readKeys.length) return []


  const currentId = counter.requestCount++
  const eventId = `${currentId}`

  if (counter.activeWorkers > maxParallelCalls) {
    counter.queue.push(eventId)
    await once(emitter, eventId)
  }

  counter.activeWorkers++

  const showEveryX = counter.queue.length > 100 ? 30 : 10 // show log fewer times if lot more are queued up
  if (currentId % showEveryX === 0) sdk.log(`request #: ${currentId} queue: ${counter.queue.length} active requests: ${counter.activeWorkers}`)

  let response
  try {
    response = await _getTokenData()
    onComplete()
  } catch (e) {
    onComplete()
    throw e
  }

  return response

  function onComplete() {
    counter.activeWorkers--
    if (counter.queue.length) {
      const nextRequestId = counter.pickFromTop ? counter.queue.shift() : counter.queue.pop()
      counter.pickFromTop = !counter.pickFromTop
      emitter.emit(<string>nextRequestId)
    }
  }

  async function _getTokenData() {
    let cachedTokenData: any[] = []

    // read data from cache where possible
    readKeys = readKeys.filter((PK: string) => {
      if (timestamp !== 'now') return true
      if (priceCache[PK]) {
        cachedTokenData.push({ ...priceCache[PK], PK })
        return false
      }
      return true
    })

    if (!readKeys.length) return cachedTokenData

    const readRequests = [];
    sdk.log(`price request count:  ${readKeys.length}`)
    for (let i = 0; i < readKeys.length; i += 100) {
      const body = {
        "coins": readKeys.slice(i, i + 100),
      } as any
      if (timestamp !== "now") {
        body.timestamp = timestamp;
      }
      readRequests.push(
        fetch("https://coins.llama.fi/prices?source=internal", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json()).then(r => {
          for (const [PK, value] of Object.entries(r.coins)) {
            priceCache[PK] = value
          }
          return Object.entries(r.coins).map(
            ([PK, value]) => ({
              ...(value as any),
              PK
            })
          )
        })
      );
    }
    const tokenData = cachedTokenData.concat(...(await Promise.all(readRequests)));
    return tokenData
  }
}

interface Counter {
  activeWorkers: number;
  requestCount: number;
  queue: string[];
  pickFromTop: boolean;
}
