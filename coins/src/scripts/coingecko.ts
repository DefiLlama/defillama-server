import { setTimer } from "../utils/shared/coingeckoLocks";
import ddb, { batchGet, batchWrite, DELETE } from "../utils/shared/dynamodb";
import {
  Coin,
  CoinMetadata,
  iterateOverPlatforms,
  lowercase,
  staleMargin,
} from "../utils/coingeckoPlatforms";
import sleep from "../utils/shared/sleep";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../utils/date";
import { CgEntry, Write } from "../adapters/utils/dbInterfaces";
import { batchReadPostgres, getRedisConnection } from "../../coins2";
import chainToCoingeckoId, { cgPlatformtoChainId } from "../../../common/chainToCoingeckoId";
import produceKafkaTopics, { Dynamo } from "../utils/coins3/produce";
import {
  fetchCgPriceData,
  retryCoingeckoRequest,
} from "../utils/getCoinsUtils";
import { storeAllTokens } from "../utils/shared/bridgedTvlPostgres";
import { sendMessage } from "../../../defi/src/utils/discord";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { cacheSolanaTokens, getSymbolAndDecimals } from "./coingeckoUtils";

// Kill the script after 5 minutes to prevent infinite execution
const TIMEOUT_MS = 10 * 60 * 1000; // 5 minutes in milliseconds
const killTimeout = setTimeout(() => {
  console.log(`Script execution exceeded ${TIMEOUT_MS/1000} seconds. Forcefully terminating.`);
  process.exit(1); // Exit with error code 1 to indicate abnormal termination
}, TIMEOUT_MS);
// Make sure the timeout doesn't prevent the Node.js process from exiting naturally
killTimeout.unref();

enum COIN_TYPES {
  over100m = "over100m",
  over10m = "over10m",
  over1m = "over1m",
  rest = "rest",
}

function cgPK(cgId: string) {
  return `coingecko#${cgId}`;
}

interface IdToSymbol {
  [id: string]: string;
}

async function storeCoinData(coinData: Write[]) {
  const items = coinData
    .map((c) => ({
      PK: c.PK,
      SK: 0,
      price: c.price,
      mcap: c.mcap,
      timestamp: c.timestamp,
      symbol: c.symbol,
      confidence: c.confidence,
      volume: c.volume,
      adapter: 'coingecko'
    }))
    .filter((c: Write) => c.symbol != null);
  await Promise.all([
    produceKafkaTopics(
      items.map((i) => {
        const { volume, ...rest } = i;
        return ({ decimals: 0, ...rest } as Dynamo)
      }),
    ),
    batchWrite(items, false),
  ]);
}

async function storeHistoricalCoinData(coinData: Write[]) {
  const items = coinData.map((c) => ({
    SK: c.SK,
    PK: c.PK,
    price: c.price,
    confidence: c.confidence,
    volume: c.volume,
  }));
  await Promise.all([
    produceKafkaTopics(
      items.map((i) => ({
        adapter: "coingecko",
        timestamp: i.SK,
        ...i,
      })) as Dynamo[],
      ["coins-timeseries"],
    ),
    batchWrite(items, false),
  ]);
}

const aggregatedPlatforms: string[] = [];

const ignoredChainSet = new Set(['sora', 'hydration', 'polkadot', 'osmosis', 'xrp', 'sonic-svm', 'vechain', 'cosmos', 'binancecoin', 'ordinals', 'saga-2', 'mantra', 'thorchain', 'initia', 'xcc', 'secret', 'icp', 'bittensor', 'kasplex', 'terra-2', 'bittorrent-old']);

async function getAndStoreCoins(coins: Coin[], rejected: Coin[]) {
  const coinData = await fetchCgPriceData(coins.map((c) => c.id));
  await storeCGCoinMetadatas(coinData);

  const timestamp = getCurrentUnixTimestamp();
  const stalePlatforms: string[] = [];
  const staleIds: string[] = [];
  coins.map((c) => {
    if (!(c.id in coinData)) return;
    if (timestamp - coinData[c.id].last_updated_at < staleMargin) return;
    Object.entries(c.platforms).map(([chain, address]) => {
      const i = cgPlatformtoChainId[chain];
      if (ignoredChainSet.has(chain) || ignoredChainSet.has(i)) return;
      if (!i) {
        console.warn('No chain found for', chain, 'in', c.id, c.platforms[chain]);
        return;
      }
      stalePlatforms.push(
        `asset#${i}:${address}`,
      );
    });
    staleIds.push(c.id);
  });

  const staleKeys = [
    ...staleIds.map((c) => `coingecko#${c}`),
    ...stalePlatforms,
  ];

  const staleEntries = (
    await batchGet(
      staleKeys.map((PK: string) => ({
        PK,
        SK: 0,
      })),
    )
  ).filter((c) => !c.adapter && c.confidence == 0.99);

  const deleteStaleKeysPromise = DELETE(
    staleEntries.map((e) => ({
      PK: e.PK,
      SK: 0,
    })),
  );

  const idToSymbol = {} as IdToSymbol;
  const returnedCoins = new Set(Object.keys(coinData));
  coins.forEach((coin) => {
    if (!returnedCoins.has(coin.id)) {
      console.error(
        `[scripts - getAndStoreCoins] Couldn't get data for ${coin.id}`,
      );
      rejected.push(coin);
    }
    idToSymbol[coin.id] = coin.symbol;
  });
  const writes: CgEntry[] = [];
  Object.entries(coinData)
    .filter((c) => c[1]?.usd !== undefined)
    .filter((c) => !staleIds.includes(c[0]))
    .map(([cgId, data]) => {
      if (cgId in idToSymbol)
        writes.push({
          PK: cgPK(cgId),
          SK: data.last_updated_at,
          price: data.usd,
          mcap: data.usd_market_cap,
          timestamp: data.last_updated_at,
          symbol: idToSymbol[cgId].toUpperCase().trim().replace(/\x00/g, ""),
          confidence: 0.99,
          volume: data.usd_24h_vol,
        });
    });

  const prevWrites: CgEntry[] = await batchGet(
    writes.map((w: CgEntry) => ({ PK: w.PK, SK: 0 })),
  );

  const prevConfidences: { [key: string]: number } = {};
  prevWrites.map((p: CgEntry) => {
    prevConfidences[p.PK] = p.confidence;
  });

  const confidentCoins: Write[] = [];
  writes.map((w: CgEntry) => {
    if (prevConfidences[w.PK] > 0.99) return;
    confidentCoins.push(w);
  });

  await storeCoinData(confidentCoins);
  await storeHistoricalCoinData(confidentCoins);
  const filteredCoins = coins.filter(
    (coin) =>
      coinData[coin.id]?.usd !== undefined && !staleIds.includes(coin.id),
  );

  const missingChainIdMapping = {} as { [key: string]: string };
  const platformQueries: string[] = filteredCoins
    .map((f: Coin) =>
      Object.entries(f.platforms).map(([chain, address]) => {
        if (ignoredChainSet.has(chain) || chain === 'hyperliquid') return; // hyperliquid key in cg is not the evm
        if (address.startsWith('ibc/') || address.startsWith('factory/') || address.startsWith('zil')) return;
        let i = cgPlatformtoChainId[chain];
        if (!i) {
          if (!missingChainIdMapping[chain])
            console.warn('[MissingChainId]', chain, 'in', f.id, f.platforms[chain]);
          missingChainIdMapping[chain] = chain;
          i = chain.toLowerCase();
        }

        return `${i}:${lowercase(address, i)}`;
      }).filter(i => i),
    )
    .flat() as string[]

  const coinPlatformDataArray: CgEntry[] = await batchGet(
    platformQueries.map((q: string) => ({
      PK: `asset#${q}`,
      SK: 0,
    })),
  );
  const coinPlatformData: { [key: string]: CgEntry } = {};
  coinPlatformDataArray.map((d: CgEntry) => {
    coinPlatformData[d.PK] = d;
  });


  const redirectKeys = [
    ...new Set(
      coinPlatformDataArray
        .map((c: any) => c.redirect)
        .filter((c: string) => c != undefined),
    ),
  ];
  const redirectDataArray: CgEntry[] = await batchGet(
    redirectKeys.map((PK: string) => ({ PK, SK: 0 })),
  );
  const redirectData: { [key: string]: CgEntry } = {};
  redirectDataArray.map((d: CgEntry) => {
    redirectData[d.PK] = d;
  });

  const pricesAndMcaps: {
    [key: string]: { price: number; mcap?: number };
  } = {};
  confidentCoins.map((c: Write) => {
    if (!c.price) return;
    pricesAndMcaps[c.PK] = { price: c.price, mcap: c.mcap };
  });

  const kafkaItems: any[] = [];
  await Promise.all(
    filteredCoins.map(async (coin) =>
      iterateOverPlatforms(
        coin,
        redirectData,
        async (PK) => {

          if (!pricesAndMcaps[cgPK(coin.id)]) {
            console.error(
              `[scripts - getAndStoreCoins 2]Couldn't get data for ${coin.id}`,
            );
            return;
          }
          try {

            const chain = PK.substring(PK.indexOf("#") + 1, PK.indexOf(":"));
            if (ignoredChainSet.has(chain)) return;
            const normalizedPK = !chainsThatShouldNotBeLowerCased.includes(chain) ? PK.toLowerCase() : PK;
            const platformData: any = coinPlatformData[normalizedPK] ?? coinPlatformData[PK] ?? {}
            if (platformData && platformData?.confidence > 0.99) return;

            const created = getCurrentUnixTimestamp();
            const address = PK.substring(PK.indexOf(":") + 1);
            let { decimals, symbol } = platformData as any
            if (decimals == undefined || symbol == undefined) {
              const symbolAndDecimals = await getSymbolAndDecimals(address, chain, coin.symbol, coin.platforms[(chainToCoingeckoId as any)[chain] || chain]);
              if (symbolAndDecimals) console.log(`Found symbol and decimals for ${coin.id} on ${chain}:`, symbolAndDecimals);
              else console.log(`Couldn't find symbol and decimals for ${coin.id} on ${chain} ${PK}`)

              if (!symbolAndDecimals) return;
              decimals = symbolAndDecimals.decimals;
              symbol = symbolAndDecimals.symbol;
            }
            if (isNaN(decimals) || decimals == '' || decimals == null) return;

            const item = {
              PK: normalizedPK,
              SK: 0,
              created,
              decimals: Number(decimals),
              symbol,
              redirect: cgPK(coin.id),
              confidence: 0.99,
              adapter: 'coingecko'
            };
            kafkaItems.push(item);
            await ddb.put(item);
          } catch (e) {
            console.error(
              `[scripts - getAndStoreCoins] Error storing platform data for ${coin.id} on ${PK}`,
            );
            console.error(e);
          }
        },
        coinPlatformData,
        aggregatedPlatforms,
      ),
    ),
  );

  await Promise.all([
    produceKafkaTopics(
      kafkaItems.map((i) => ({ adapter: "coingecko", ...i })),
      ["coins-metadata"],
    ),
    deleteStaleKeysPromise,
  ]);
}

const HOUR = 3600;
async function getAndStoreHourly(
  coin: Coin,
  rejected: Coin[],
  toTimestamp: number = getCurrentUnixTimestamp(), // for backfilling
) {
  const fromTimestamp = toTimestamp - (24 * HOUR - 5 * 60); // 24h - 5 mins
  const coinData = await retryCoingeckoRequest(
    `coins/${coin.id}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
    3,
  );
  if (!Array.isArray(coinData.prices) || !coinData.prices.length) {
    console.error(
      `[scripts - getAndStoreHourly] Couldn't get data for ${coin.id}`,
    );
    rejected.push(coin);
    return;
  }
  const PK = cgPK(coin.id);

  const prevWritenItems = await batchReadPostgres(
    `coingecko:${coin.id}`,
    toUNIXTimestamp(coinData.prices[0][0]),
    toUNIXTimestamp(coinData.prices[coinData.prices.length - 1][0]),
  );
  if (
    prevWritenItems.length > 0 &&
    prevWritenItems[prevWritenItems.length - 1].confidence > 29700
  )
    return;
  const writtenTimestamps = Object.values(prevWritenItems).map(
    (c: any) => c.timestamp,
  );

  const items = coinData.prices
    .filter((price) => {
      const ts = toUNIXTimestamp(price[0]);
      return !writtenTimestamps[ts];
    })
    .map((price) => ({
      SK: toUNIXTimestamp(price[0]),
      PK,
      price: price[1],
      confidence: 0.99,
    }));

  await Promise.all([
    produceKafkaTopics(
      items.map(
        (i) => ({ adapter: "coingecko", timestamp: i.SK, ...i }),
        ["coins-timeseries"],
      ),
    ),
    batchWrite(items, false),
  ]);
}

async function fetchCoingeckoData(
  coins: Coin[],
  hourly: boolean,
  depth: number = 0,
) {
  const step = 80;
  const rejected = [] as Coin[];
  const timer = setTimer();
  const requests: Promise<void>[] = [];

  if (hourly) {
    // COMMENTS HERE ARE USEFUL FOR BACKFILLING CG DATA!!!!
    // let start = 1755989400;
    // const timestamps: number[] = [];
    // while (start < 1756041435) {
    //   timestamps.push(start);
    //   start += 3600;
    // }
    // timestamps.push(start + 3600);
    // for (let i = 0; i < timestamps.length; i++) {
    await Promise.all(coins.map((coin) => getAndStoreHourly(coin, rejected)));
    // }
  } else {
    for (let i = 0; i < coins.length; i += step) {
      requests.push(getAndStoreCoins(coins.slice(i, i + step), rejected));
    }
    await Promise.all(requests);
    await storeAllTokens(aggregatedPlatforms);
  }
  clearInterval(timer);
  if (rejected.length > 0) {
    if (depth >= 2) {
      console.error("Unprocessed coins", rejected);
      return;
    } else {
      await sleep(10e3); // 10 seconds
      await fetchCoingeckoData(rejected, hourly, depth + 1);
    }
  }
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function triggerFetchCoingeckoData(hourly: boolean, coinType?: string) {
  try {
    await cacheSolanaTokens();
    console.log("solana tokens received")
    const step = 500;

    setTimer();
    let coins: any = await retryCoingeckoRequest('coins/list?include_platform=true', 5)
    // coins = coins.filter((coin) => coin.id == 'euro-coin');
    // if (!coins.length) process.exit(0)

    if (coinType || hourly) {
      const metadatas = await getCGCoinMetadatas(
        coins.map((coin) => coin.id),
        coinType,
      );
      coins = coins.filter((coin) => {
        const metadata = metadatas[coin.id];
        if (!metadata) return true; // if we don't have metadata, we don't know if it's over 10m
        if (hourly) {
          return metadata.usd_market_cap > 1e8 && metadata.usd_24h_vol > 1e8;
        }
        return (
          metadata.coinType === coinType ||
          metadata.coinType === COIN_TYPES.over100m
        ); // always include over100m coins
      });
    }
    console.log(
      `Fetching prices for ${coins.length} coins`,
      "running hourly:",
      hourly,
      "coinType:",
      coinType,
    );
    shuffleArray(coins);
    let promises: Promise<void>[] = [];
    for (let i = 0; i < coins.length; i += step) {
      promises.push(fetchCoingeckoData(coins.slice(i, i + step), hourly, 0));
    }
    await Promise.all(promises);
  } catch (e) {
    console.error("Error in coingecko script");
    console.error("Error type:", typeof e);
    console.error("Error message:", e instanceof Error ? e.message : e);
    console.error("Error stack:", e instanceof Error ? e.stack : "No stack trace");
    
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    if (process.env.URGENT_COINS_WEBHOOK)
      await sendMessage(
        `coingecko ${hourly} ${coinType} failed with: ${errorMessage}`,
        process.env.URGENT_COINS_WEBHOOK,
        true,
      );
    else
      await sendMessage(
        `coingecko error but missing urgent webhook: ${errorMessage}`,
        process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        true,
      );
  }
}

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the hourly bool.
    Eg: ts-node coins/src/scripts/coingecko.ts true`);
  process.exit(1);
} else {
  process.env.tableName = "prod-coins-table";
  const isHourlyRun = process.argv[2] == "true";
  const coinType = process.argv[3] ?? undefined;
  if (
    coinType &&
    ![
      COIN_TYPES.over100m,
      COIN_TYPES.over10m,
      COIN_TYPES.over1m,
      COIN_TYPES.rest,
    ].includes(coinType as any)
  ) {
    console.error(`Invalid coin type: ${coinType}`);
    process.exit(1);
  }
  triggerFetchCoingeckoData(isHourlyRun, coinType).then(() => {
    console.log("Exiting now...");
    process.exit(0);
  });
}

async function getCGCoinMetadatas(coinIds: string[], coinType?: string) {
  const idResponse = {} as {
    [id: string]: CoinMetadata;
  };

  try {
    const redis = await getRedisConnection();
    const res = await redis.mget(coinIds.map((id) => `cgMetadata:${id}`));
    const jsonData = res.map((i: any) => {
      try {
        return JSON.parse(i);
      } catch (parseError) {
        console.error("Failed to parse JSON from Redis:", parseError);
        throw parseError;
      }
    });
    jsonData.map((data: any) => {
      if (!data) return;
      idResponse[data.id] = data;
    });
  } catch (e) {
    console.error("Error reading CG metadata to redis");
    console.error("Redis error details:", e);
    if (coinType === COIN_TYPES.over100m)
      // if we can't read from redis, we can't filter by coinType and since over100m runs too frequently, we should throw an error and not proceed
      throw new Error(`Redis connection failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  return idResponse;
}

async function storeCGCoinMetadatas(coinMetadatas: any) {
  try {
    const metadatas = Object.entries(coinMetadatas).map(([id, data]: any) => {
      data.id = id;
      let coinType = COIN_TYPES.rest;
      if (data.usd_market_cap > 1e8 && data.usd_24h_vol > 1e8)
        coinType = COIN_TYPES.over100m;
      else if (data.usd_market_cap > 1e7 && data.usd_24h_vol > 1e7)
        coinType = COIN_TYPES.over10m;
      else if (data.usd_market_cap > 1e6 || data.usd_24h_vol > 1e6)
        coinType = COIN_TYPES.over1m;
      data.coinType = coinType;
      return data;
    });
    const redis = await getRedisConnection();
    const writes = metadatas.map((metadata) => [
      `cgMetadata:${metadata.id}`,
      JSON.stringify(metadata),
    ]);
    if (!writes.length) return;
    await redis.mset(writes.flat());
  } catch (e) {
    console.error("Error writing to CG metadata to redis");
    console.error(e);
  }
}
