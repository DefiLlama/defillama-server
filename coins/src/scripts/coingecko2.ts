import fetch from "node-fetch";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import { Connection, PublicKey } from "@solana/web3.js";
import ddb, { batchWrite, batchGet } from "../utils/shared/dynamodb";
import { getCoinPlatformData } from "../utils/coingeckoPlatforms";
import { Coin, iterateOverPlatforms } from "../utils/coingeckoPlatforms";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../utils/date";
import { Write } from "../adapters/utils/dbInterfaces";
import { filterWritesWithLowConfidence } from "../adapters/utils/database";
import { batchWrite2 } from "../../coins2";
import { sendMessage } from "../../../defi/src/utils/discord";
import { getCache, setCache } from "../utils/cache";

let solanaConnection = new Connection(
  process.env.SOLANA_RPC || "https://rpc.ankr.com/solana",
);

function cgPK(cgId: string) {
  return `coingecko#${cgId}`;
}

interface CoinInfoMap {
  [cgId: string]: Coin;
}

interface IdToSymbol {
  [id: string]: string;
}

interface CoinPriceData {
  id: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  last_updated: number;
}

async function storeCoinData(coinData: any[]) {
  const writes2: any[] = [];
  coinData.map((c: Write) => {
    if (c.price == null) return;
    writes2.push({
      key: c.PK,
      timestamp: c.SK,
      price: c.price,
      confidence: c.confidence,
      symbol: c.symbol,
      adapter: "coingecko",
      mcap: c.mcap,
    });
  });
  try {
    // await batchWrite2(writes2, false, 5 * 60);
  } catch (e) {
    console.error(e);
  }
  return batchWrite(
    coinData.map((c) => ({
      PK: c.PK,
      SK: 0,
      price: c.price,
      mcap: c.mcap,
      timestamp: c.timestamp,
      symbol: c.symbol,
      confidence: c.confidence,
    })),
    false,
  );
}

async function storeHistoricalCoinData(coinData: Write[]) {
  const writes2: any[] = [];
  coinData.map((c: Write) => {
    if (c.price == null) return;
    writes2.push({
      key: c.PK,
      timestamp: c.SK,
      price: c.price,
      confidence: c.confidence,
    });
  });
  try {
    // await batchWrite2(writes2, false, 5 * 60);
  } catch (e) {
    console.error(e);
  }
  return batchWrite(
    coinData.map((c) => ({
      SK: c.SK,
      PK: c.PK,
      price: c.price,
      confidence: c.confidence,
    })),
    false,
  );
}

const debugStats = {
  tokenSymbolInfoFetches: 0,
  cgPremiumCalls: 0,
};

let solanaTokens: Promise<any>;
async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
  cgCache: any = {},
) {
  if (!cgCache.symbols) cgCache.symbols = {};
  if (!cgCache.symbols[chain]) cgCache.symbols[chain] = {};

  const chainCache = cgCache.symbols[chain];
  if (chainCache[tokenAddress]) return chainCache[tokenAddress];
  debugStats.tokenSymbolInfoFetches++;

  if (chain === "solana") {
    if (solanaTokens === undefined) {
      solanaTokens = fetch(
        "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
      ).then((r) => r.json());
    }
    const token = ((await solanaTokens).tokens as any[]).find(
      (t) => t.address === tokenAddress,
    );
    if (token === undefined) {
      const decimalsQuery = await solanaConnection.getParsedAccountInfo(
        new PublicKey(tokenAddress),
      );
      const decimals = (decimalsQuery.value?.data as any)?.parsed?.info
        ?.decimals;
      if (typeof decimals !== "number") {
        return;
        // throw new Error(
        //   `Token ${chain}:${tokenAddress} not found in solana token list`,
        // );
      }

      chainCache[tokenAddress] = {
        symbol: coingeckoSymbol.toUpperCase(),
        decimals: decimals,
      };
      return chainCache[tokenAddress];
    }
    chainCache[tokenAddress] = {
      symbol: token.symbol,
      decimals: Number(token.decimals),
    };
    return chainCache[tokenAddress];
  } else if (!tokenAddress.startsWith(`0x`)) {
    return;
    // throw new Error(
    //   `Token ${chain}:${tokenAddress} is not on solana or EVM so we cant get token data yet`,
    // );
  } else {
    try {
      chainCache[tokenAddress] = {
        symbol: (await symbol(tokenAddress, chain as any)).output,
        decimals: Number((await decimals(tokenAddress, chain as any)).output),
      };
      return chainCache[tokenAddress];
    } catch (e) {
      return;
      // throw new Error(
      //   `ERC20 methods aren't working for token ${chain}:${tokenAddress}`,
      // );
    }
  }
}

async function getAndStoreCoins(
  coinsData: CoinPriceData[],
  coinInfoMap: CoinInfoMap,
  cgCache: any,
) {
  coinsData = coinsData.filter((c) => c.current_price);
  const idToSymbol = {} as IdToSymbol;
  coinsData.forEach((coin) => (idToSymbol[coin.id] = coin.symbol));
  const timestamp = getCurrentUnixTimestamp();
  const writes = coinsData.map((data) => ({
    PK: cgPK(data.id),
    SK: Math.floor(+new Date(data.last_updated) / 1e3),
    price: data.current_price,
    mcap: data.market_cap,
    timestamp,
    symbol: data.symbol.toUpperCase(),
    confidence: 0.99,
  }));
  const confidentCoins = await filterWritesWithLowConfidence(writes, 1);
  await storeCoinData(confidentCoins);
  await storeHistoricalCoinData(confidentCoins);
  const filteredCoins = coinsData
    .map((c) => coinInfoMap[c.id])
    .filter((i) => i);
  const coinPlatformData = await getCoinPlatformData(filteredCoins);

  const pricesAndMcaps: {
    [key: string]: { price: number; mcap?: number };
  } = {};
  confidentCoins.map((c: Write) => {
    if (!c.price) return;
    pricesAndMcaps[c.PK] = { price: c.price, mcap: c.mcap };
  });
  const writes2: any[] = [];
  await Promise.all(
    filteredCoins.map(async (coin) =>
      iterateOverPlatforms(
        coin,
        async (PK, tokenAddress, chain) => {
          const previous = await ddb.get({ PK, SK: 0 });
          if (previous.Item?.confidence > 0.99) return;

          const data = await getSymbolAndDecimals(
            tokenAddress,
            chain,
            coin.symbol,
            cgCache,
          );
          if (!data) return;
          const { decimals, symbol } = data;

          writes2.push({
            key: PK,
            timestamp: getCurrentUnixTimestamp(),
            price: pricesAndMcaps[cgPK(coin.id)].price,
            decimals: decimals,
            symbol: symbol,
            confidence: 0.99,
            adapter: "coingecko",
            mcap: pricesAndMcaps[cgPK(coin.id)].mcap,
          });
          await ddb.put({
            PK,
            SK: 0,
            created: timestamp,
            decimals: decimals,
            symbol: symbol,
            redirect: cgPK(coin.id),
            confidence: 0.99,
          });
        },
        coinPlatformData,
      ),
    ),
  );

  if (writes2.length == 0) return;
  try {
    // await batchWrite2(writes2, false);
  } catch (e) {
    console.error(e);
  }
}

const HOUR = 3600;
async function getAndStoreHourly(coin: Coin) {
  const toTimestamp = getCurrentUnixTimestamp();
  const fromTimestamp = toTimestamp - (36 * HOUR - 5 * 60);
  const { prices } = await getCGData(
    `/api/v3/coins/${coin.id}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
  );
  if (!Array.isArray(prices)) {
    console.error(`[coingecko2 - getAndStoreHourly] Couldn't get data for ${coin.id}`);
    return;
  }
  const PK = cgPK(coin.id);
  const prevWritenItems = await batchGet(
    prices.map((price: any) => ({ SK: toUNIXTimestamp(price[0]), PK })),
  );
  const writtenTimestamps = prevWritenItems.reduce((all, item) => {
    all[item.SK] = true;
    return all;
  }, {});

  await batchWrite(
    prices
      .filter((price) => {
        const ts = toUNIXTimestamp(price[0]);
        return !writtenTimestamps[ts];
      })
      .map((price) => ({
        SK: toUNIXTimestamp(price[0]),
        PK,
        price: price[1],
        confidence: 0.99,
      })),
    false,
  );

  // await batchWrite2(
  //   prices
  //     .filter((price) => {
  //       const ts = toUNIXTimestamp(price[0]);
  //       return !writtenTimestamps[ts];
  //     })
  //     .map((price) => ({
  //       timestamp: toUNIXTimestamp(price[0]),
  //       key: PK,
  //       price: price[1],
  //       confidence: 0.99,
  //       adapter: "coingecko",
  //       symbol: coin.symbol,
  //     })),
  //   false,
  // );
}

async function getCGData(uri: string) {
  try {
    let data = await fetch("https://api.coingecko.com" + uri);
    data = await data.json();

    if (Object.keys(data).length == 1 && Object.keys(data)[0] == "status")
      throw new Error(`cg call failed`);

    return data;
  } catch (e) {
    let data = await fetch(
      `https://pro-api.coingecko.com${uri}&x_cg_pro_api_key=${process.env.CG_KEY}`,
    );
    return data.json();
  }
}

async function fetchCoingeckoData(
  coinInfoMap: CoinInfoMap,
  runType: string,
  cgCache: any,
) {
  let page = 1;
  let hasMore = true;
  const allData: any[] = [];
  do {
    let coinData = (await getCGData(
      `/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&locale=en`,
    )) as CoinPriceData[];
    page++;

    switch (runType) {
      case "hourly":
        hasMore =
          coinData.filter((coin) => coin.market_cap > 1e8).length === 250;
        coinData = coinData.filter(
          (coin) => coin.market_cap > 1e8 && coin.total_volume > 1e7,
        );
        for (const coin of coinData) {
          await getAndStoreHourly(coinInfoMap[coin.id]);
        }
        break;
      case "mainCoins":
        hasMore =
          coinData.filter((coin) => coin.market_cap > 1e6).length === 250;
        coinData = coinData.filter(
          (coin) => coin.market_cap > 1e6 && coin.total_volume > 1e5,
        );
        await getAndStoreCoins(coinData, coinInfoMap, cgCache);
        break;
      case "allCoins":
      default:
        hasMore = coinData.length === 250;
        await getAndStoreCoins(coinData, coinInfoMap, cgCache);
    }
    allData.push(...coinData);
  } while (hasMore);
  return allData;
}

async function triggerFetchCoingeckoData(runType: string) {
  const cgCache = await getCache("coingecko", runType);
  const coins = (await getCGData(
    `/api/v3/coins/list?include_platform=true`,
  )) as Coin[];
  const coinInfoMap: CoinInfoMap = {};
  coins.forEach((coin) => (coinInfoMap[coin.id] = coin));
  await fetchCoingeckoData(coinInfoMap, runType, cgCache);
  setCache("coingecko", runType, cgCache);
  process.exit(0);
}

const runType = process.argv[2];

switch (runType) {
  case "hourly":
  case "mainCoins":
  case "allCoins":
    triggerFetchCoingeckoData(runType);
    break;
  default:
    console.error(`Missing argument, you need to provide a run type: hourly, mainCoins, allCoins
      Eg: ts-node coins/src/scripts/coingecko2.ts hourly`);
    process.exit(1);
}
