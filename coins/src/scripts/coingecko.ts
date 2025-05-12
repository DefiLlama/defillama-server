import fetch from "node-fetch";
import { setTimer } from "../utils/shared/coingeckoLocks";
import ddb, { batchGet, batchWrite, DELETE } from "../utils/shared/dynamodb";
import {
  Coin,
  CoinMetadata,
  iterateOverPlatforms,
  staleMargin,
} from "../utils/coingeckoPlatforms";
import sleep from "../utils/shared/sleep";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../utils/date";
import { CgEntry, Write } from "../adapters/utils/dbInterfaces";
import { batchReadPostgres, getRedisConnection } from "../../coins2";
import chainToCoingeckoId from "../../../common/chainToCoingeckoId";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import produceKafkaTopics, { Dynamo } from "../utils/coins3/produce";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../adapters/solana/utils";
import {
  chainsThatShouldNotBeLowerCased,
  chainsWithCaseSensitiveDataProviders,
} from "../utils/shared/constants";
import {
  fetchCgPriceData,
  retryCoingeckoRequest,
} from "../utils/getCoinsUtils";
import { storeAllTokens } from "../utils/shared/bridgedTvlPostgres";
import { sendMessage } from "../../../defi/src/utils/discord";
import { cairoErc20Abis, call, feltArrToStr } from "../adapters/utils/starknet";

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
    }))
    .filter((c: Write) => c.symbol != null);
  await Promise.all([
    produceKafkaTopics(
      items.map((i) => ({ adapter: "coingecko", decimals: 0, ...i } as Dynamo)),
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

let solanaTokens: Promise<any>;
let _solanaTokens: Promise<any>;
async function cacheSolanaTokens() {
  if (_solanaTokens === undefined) {
    _solanaTokens = fetch(
      "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
    );
    solanaTokens = _solanaTokens.then((r) => r.json());
  }
  return solanaTokens;
}

let hyperliquidTokens: Promise<any>;
let _hyperliquidTokens: Promise<any>;
async function cacheHyperliquidTokens() {
  try {
    if (_hyperliquidTokens === undefined) {
      _hyperliquidTokens = fetch(`https://api.hyperliquid.xyz/info`, {
        method: "POST",
        body: JSON.stringify({ type: "spotMeta" }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      hyperliquidTokens = _hyperliquidTokens.then((r) => r.json());
    }
  } catch (e) {
    console.error(`Hyperliquid API failed with: ${e}`);
    hyperliquidTokens = new Promise((res) => res({ tokens: [] }));
  }
  return hyperliquidTokens;
}

async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
): Promise<{ symbol: string; decimals: number } | undefined> {
  if (chainsThatShouldNotBeLowerCased.includes(chain)) {
    const token = ((await solanaTokens).tokens as any[]).find(
      (t) => t.address === tokenAddress,
    );
    if (token === undefined) {
      const solanaConnection = getConnection(chain);
      const decimalsQuery = await solanaConnection.getParsedAccountInfo(
        new PublicKey(tokenAddress),
      );
      const decimals = (decimalsQuery.value?.data as any)?.parsed?.info
        ?.decimals;
      if (typeof decimals !== "number") {
        // return;
        throw new Error(
          `Token ${chain}:${tokenAddress} not found in solana token list`,
        );
      }
      return {
        symbol: coingeckoSymbol.toUpperCase(),
        decimals: decimals,
      };
    }
    return {
      symbol: token.symbol,
      decimals: Number(token.decimals),
    };
  } else if (chain == "starknet") {
    try {
      const [symbol, decimals] = await Promise.all([
        call({
          abi: cairoErc20Abis.symbol,
          target: tokenAddress,
        }).then((r) => feltArrToStr([r])),
        call({
          abi: cairoErc20Abis.decimals,
          target: tokenAddress,
        }).then((r) => Number(r)),
      ]);
      return { symbol, decimals };
    } catch (e) {
      return;
    }
  } else if (chain == "hedera") {
    try {
      const { symbol, decimals } = await fetch(
        `${
          process.env.HEDERA_RPC ?? "https://mainnet.mirrornode.hedera.com"
        }/api/v1/tokens/${tokenAddress}`,
      ).then((r) => r.json());
      return { symbol, decimals };
    } catch (e) {
      return;
    }
    // } else if (chain == "hyperliquid") {
    //   await cacheHyperliquidTokens();
    //   const token = ((await hyperliquidTokens).tokens as any[]).find(
    //     (t) => t.tokenId === tokenAddress,
    //   );
    //   if (!token) return;
    //   return {
    //     decimals: token.weiDecimals,
    //     symbol: token.name,
    //   };
  } else if (chain == "aptos") {
    const res = await fetch(
      `${process.env.APTOS_RPC}/v1/accounts/${tokenAddress.substring(
        0,
        tokenAddress.indexOf("::"),
      )}/resource/0x1::coin::CoinInfo%3C${tokenAddress}%3E`,
    ).then((r) => r.json());
    if (!res.data) return;
    return {
      decimals: res.data.decimals,
      symbol: res.data.symbol,
    };
  } else if (chain == "stacks") {
    const res = await fetch(
      `https://api.hiro.so/metadata/v1/ft/${tokenAddress}`,
    ).then((r) => r.json());
    if (!res.decimals) return;
    return {
      decimals: res.decimals,
      symbol: res.symbol,
    };
  } else if (!tokenAddress.startsWith(`0x`)) {
    return;
    // throw new Error(
    //   `Token ${chain}:${tokenAddress} is not on solana or EVM so we cant get token data yet`,
    // );
  } else {
    try {
      return {
        symbol: (await symbol(tokenAddress, chain as any)).output,
        decimals: Number((await decimals(tokenAddress, chain as any)).output),
      };
    } catch (e) {
      return;
      // throw new Error(
      //   `ERC20 methods aren't working for token ${chain}:${tokenAddress}`,
      // );
    }
  }
}

const aggregatedPlatforms: string[] = [];

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
      const i = Object.values(chainToCoingeckoId).indexOf(chain);
      stalePlatforms.push(
        `asset#${Object.keys(chainToCoingeckoId)[i]}:${address}`,
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
          symbol: idToSymbol[cgId].toUpperCase(),
          confidence: 0.99,
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
  const platformQueries = filteredCoins
    .map((f: Coin) =>
      Object.entries(f.platforms).map(([chain, address]) => {
        const i = Object.values(chainToCoingeckoId).indexOf(chain);
        return `${Object.keys(chainToCoingeckoId)[i]}:${address}`;
      }),
    )
    .flat();

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
        async (PK) => {
          const chain = PK.substring(PK.indexOf("#") + 1, PK.indexOf(":"));
          const normalizedPK = chainsWithCaseSensitiveDataProviders.includes(
            chain,
          )
            ? PK.toLowerCase()
            : PK;
          const platformData = coinPlatformData[normalizedPK];
          if (platformData && platformData?.confidence > 0.99) return;

          const created = getCurrentUnixTimestamp();
          const address = PK.substring(PK.indexOf(":") + 1);
          const { decimals, symbol } =
            platformData &&
            "decimals" in platformData &&
            "symbol" in platformData
              ? (coinPlatformData[normalizedPK] as any)
              : await getSymbolAndDecimals(address, chain, coin.symbol);

          if (decimals == undefined) return;

          if (!pricesAndMcaps[cgPK(coin.id)]) {
            console.error(
              `[scripts - getAndStoreCoins 2]Couldn't get data for ${coin.id}`,
            );
            return;
          }

          const item = {
            PK: normalizedPK,
            SK: 0,
            created,
            decimals,
            symbol,
            redirect: cgPK(coin.id),
            confidence: 0.99,
          };
          kafkaItems.push(item);
          await ddb.put(item);
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
    // let start = 1696786585;
    // const timestamps: number[] = [];
    // while (start < 1696877028) {
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
    const step = 500;
    let coins = (await fetch(
      `https://pro-api.coingecko.com/api/v3/coins/list?include_platform=true&x_cg_pro_api_key=${process.env.CG_KEY}`,
    ).then((r) => r.json())) as Coin[];

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
    console.error(e);
    if (process.env.URGENT_COINS_WEBHOOK)
      await sendMessage(
        `coingecko ${hourly} ${coinType} failed with: ${e}`,
        process.env.URGENT_COINS_WEBHOOK,
        true,
      );
    else
      await sendMessage(
        `coingecko error but missing urgent webhook`,
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
    const jsonData = res.map((i: any) => JSON.parse(i));
    jsonData.map((data: any) => {
      if (!data) return;
      idResponse[data.id] = data;
    });
  } catch (e) {
    console.error("Error reading CG metadata to redis");
    console.error(e);
    if (coinType === COIN_TYPES.over100m)
      // if we can't read from redis, we can't filter by coinType and since over100m runs too frequently, we should throw an error and not proceed
      throw e;
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
