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
      if (address.startsWith("solana:") || address.startsWith('eclipse')) {
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
  const symbolToAddresses: { [symbol: string]: string[] } = {};
  const now = timestamp === "now" ? Math.round(Date.now() / 1000) : timestamp;
  const tokenData = await getTokenData(readKeys, timestamp)
  const staleCoinsInclusive: any = {};
  tokenData.forEach((response: any) => {
    if (Math.abs(response.timestamp - now) < searchWidth) {
      PKsToTokens[response.PK].forEach((address) => {
        const balance = balances[address];
        const { price, decimals } = response;
        if (!price) return;

        const symbol = (response.symbol as string).toUpperCase();
        const amount = response.PK.startsWith('coingecko:') ? Number(balance) : new BigNumber(balance).div(10 ** decimals).toNumber();

        const usdAmount = amount * price;
        checkForStaleness(usdAmount, response, now, protocol, staleCoinsInclusive);
        tokenBalances[symbol] = (tokenBalances[symbol] ?? 0) + amount;
        usdTokenBalances[symbol] = (usdTokenBalances[symbol] ?? 0) + usdAmount;
        usdTvl += usdAmount;
        if (!symbolToAddresses[symbol]) symbolToAddresses[symbol] = [];
        if (!symbolToAddresses[symbol].includes(address)) symbolToAddresses[symbol].push(address);
      });
    }
  });

  appendToStaleCoins(usdTvl, staleCoinsInclusive, staleCoins);

  return {
    usdTvl,
    tokenBalances,
    usdTokenBalances,
    symbolToAddresses,
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
    PK: "coingecko:tether",
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

    function filterReadKeys() {
      // read data from cache where possible
      readKeys = readKeys.filter((PK: string) => {
        if (timestamp !== 'now') return true
        if (priceCache[PK]) {
          cachedTokenData.push(priceCache[PK])
          return false
        }
        return true
      })
    }

    function addToCache(tokenData: any) {
      // Only cache current-price responses — historical prices would skew later "now" lookups.

      if (timestamp !== 'now') return;
      for (const [PK, value] of Object.entries(tokenData)) {
        (value as any).PK = PK
        priceCache[PK] = value
      }
    }

    function addPKToResponse(res: any) {
      if (!res) return;
      for ( const [PK, value] of Object.entries(res)) {
        (value as any).PK = PK
      }
    }


    if (!readKeys.length) return cachedTokenData

    sdk.log(`price request count:  ${readKeys.length}`)

    if (process.env.COINS_V4_API_URL) {
      try {

        filterReadKeys()

        const headers: any = { "Content-Type": "application/json" }
        if (process.env.COINS_V4_INTERNAL_PASSWORD) headers["x-coins-password"] = process.env.COINS_V4_INTERNAL_PASSWORD
        const url = `${process.env.COINS_V4_API_URL.replace(/\/$/, '')}/prices`
        const chunkSize = 40000
        const chunks: string[][] = []
        for (let i = 0; i < readKeys.length; i += chunkSize) {
          chunks.push(readKeys.slice(i, i + chunkSize))
        }
        const allCoins: Record<string, any> = {}
        const { errors } = await sdk.util.runInPromisePool({
          items: chunks,
          permitFailure: false,
          concurrency: 5,
          processor: async (chunk: any) => {
            const body: any = { coins: chunk }
            if (timestamp !== "now") body.timestamp = timestamp

            const r = await fetch(url, { method: "POST", body: JSON.stringify(body), headers }).then((res) => res.json())
            
            if (!r?.coins) 
              throw new Error(`Invalid response from coins v4 API: ${JSON.stringify(r)}`)

            addPKToResponse(r.coins)
            addToCache(r.coins)

            Object.assign(allCoins, r.coins) // we are doing this instead of pushing to an array to avoid duplicates if v4 fails and we have to fallback to the old method 
          }
        })

        if (errors.length) throw errors[0]

        const allCoinsArray = Object.values(allCoins)
        sdk.log(`fetched ${allCoinsArray.length} coins from coins v4 API`)
        return cachedTokenData.concat(allCoinsArray)

      } catch (e) {
        console.log(`Coins v4 API failed, falling back to old method: ${e}`)
      }
    }

    filterReadKeys()

    const chunks: string[][] = []

    for (let i = 0; i < readKeys.length; i += 100) {
      chunks.push(readKeys.slice(i, i + 100))
    }

    const { errors } = await sdk.util.runInPromisePool({
      items: chunks,
      permitFailure: false,
      concurrency: 11,
      processor: async (chunk: any) => {
        if (!chunk.length) return;

        const body: any = { coins: chunk }
        if (timestamp !== "now") body.timestamp = timestamp
        const r = await fetch("https://coins.llama.fi/prices?source=internal", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }).then((res) => res.json())
        if (!r.coins) {
          console.log(`Invalid response from price API for keys ${chunk.join(", ")}: ${JSON.stringify(r)}`)
          return;
        }

        addPKToResponse(r.coins)
        addToCache(r.coins)

        const resultsArray = Object.values(r.coins)
        cachedTokenData = cachedTokenData.concat(resultsArray)
      }
    })

    if (errors.length) {
      console.log(`Error fetching from price API: ${errors[0]}`)
      throw errors[0]
    }

    return cachedTokenData
  }
}

interface Counter {
  activeWorkers: number;
  requestCount: number;
  queue: string[];
  pickFromTop: boolean;
}