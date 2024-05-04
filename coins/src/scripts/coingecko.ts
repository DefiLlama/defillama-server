import fetch from "node-fetch";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import { Connection, PublicKey } from "@solana/web3.js";
import { getCoingeckoLock, setTimer } from "../utils/shared/coingeckoLocks";
import ddb, { batchWrite } from "../utils/shared/dynamodb";
import { Coin, iterateOverPlatforms } from "../utils/coingeckoPlatforms";
import sleep from "../utils/shared/sleep";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "../utils/date";
import { Write } from "../adapters/utils/dbInterfaces";
import { batchReadPostgres, batchWrite2, readCoins2 } from "../../coins2";
import chainToCoingeckoId from "../../../common/chainToCoingeckoId";

let solanaConnection = new Connection(
  process.env.SOLANA_RPC || "https://rpc.ankr.com/solana",
);

function cgPK(cgId: string) {
  return `coingecko#${cgId}`;
}

export async function retryCoingeckoRequest(
  query: string,
  retries: number,
): Promise<CoingeckoResponse> {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      const res = (await fetch(
        `https://pro-api.coingecko.com/api/v3/${query}&x_cg_pro_api_key=${process.env.CG_KEY}`,
      ).then((r) => r.json())) as CoingeckoResponse;
      if (Object.keys(res).length == 1 && Object.keys(res)[0] == "status")
        throw new Error(`cg call failed`);
      return res;
    } catch (e) {
      if ((i + 1) % 3 === 0 && retries > 3) {
        await sleep(10e3); // 10s
      }
      continue;
    }
  }
  return {};
}

interface CoingeckoResponse {
  [cgId: string]: {
    usd: number;
    usd_market_cap: number;
    last_updated_at: number;
    usd_24h_vol: number;
  };
}

interface IdToSymbol {
  [id: string]: string;
}

async function storeCoinData(coinData: any[]) {
  const writes2: any[] = [];
  coinData.map((c: Write) => {
    if (c.price == null) return;
    writes2.push({
      key: c.PK.replace("#", ":"),
      timestamp: c.SK,
      price: c.price,
      confidence: c.confidence,
      symbol: c.symbol,
      adapter: "coingecko",
      mcap: c.mcap || null,
      chain: c.PK.substring(0, c.PK.replace("#", ":").indexOf(":")),
    });
  });
  try {
    await batchWrite2(writes2, false, 5 * 60, "line 74");
  } catch (e) {
    console.error(e);
  }
  return batchWrite(
    coinData
      .map((c) => ({
        PK: c.PK,
        SK: 0,
        price: c.price,
        mcap: c.mcap,
        timestamp: c.timestamp,
        symbol: c.symbol,
        confidence: c.confidence,
      }))
      .filter((c: any) => c.symbol != null),
    false,
  );
}

async function storeHistoricalCoinData(coinData: Write[]) {
  const writes2: any[] = [];
  coinData.map((c: Write) => {
    if (c.price == null) return;
    writes2.push({
      key: c.PK.replace("#", ":"),
      timestamp: c.SK,
      price: c.price,
      confidence: c.confidence,
      chain: "coingecko",
    });
  });
  try {
    // await batchWrite2(writes2, false, 5 * 60, "line 106");
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

async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
) {
  if (chain === "solana") {
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
async function getPlatformData(coins: Coin[]) {
  const coinIds = coins.map((c) => c.id);
  const coinData = await retryCoingeckoRequest(
    `simple/price?ids=${coinIds.join(
      ",",
    )}&vs_currencies=usd&include_market_cap=true&include_last_updated_at=true`,
    10,
  );
  const filteredCoins = coins.filter(
    (coin) => coinData[coin.id]?.usd !== undefined,
  );
  const keyMap: { [id: string]: string[] } = {};
  filteredCoins.map((f: Coin) =>
    Object.entries(f.platforms).map((p: any) => {
      if (!(f.id in keyMap)) keyMap[f.id] = [];
      const i = Object.values(chainToCoingeckoId).indexOf(p[0]);
      keyMap[f.id].push(`${Object.keys(chainToCoingeckoId)[i]}:${p[1]}`);
    }),
  );
  return keyMap;
}
const blacklist = [];
async function getAndStoreCoins(coins: Coin[], rejected: Coin[]) {
  const coinIds = coins.map((c) => c.id);
  const coinData = await retryCoingeckoRequest(
    `simple/price?ids=${coinIds.join(
      ",",
    )}&vs_currencies=usd&include_market_cap=true&include_last_updated_at=true`,
    10,
  );
  const idToSymbol = {} as IdToSymbol;
  const returnedCoins = new Set(Object.keys(coinData));
  coins.forEach((coin) => {
    if (!returnedCoins.has(coin.id)) {
      console.error(`[scripts - getAndStoreCoins] Couldn't get data for ${coin.id}`);
      rejected.push(coin);
    }
    idToSymbol[coin.id] = coin.symbol;
  });
  const writes = Object.entries(coinData)
    .filter((c) => c[1]?.usd !== undefined)
    .map(([cgId, data]) => ({
      PK: cgPK(cgId),
      SK: data.last_updated_at,
      price: data.usd,
      mcap: data.usd_market_cap,
      timestamp: data.last_updated_at,
      symbol: idToSymbol[cgId].toUpperCase(),
      confidence: 0.99,
    }));

  const prevWrites = await readCoins2(
    writes.map((w: any) => ({
      key: w.PK.replace("asset#", "").replace("#", ":"),
      timestamp: getCurrentUnixTimestamp(),
    })),
    true,
    86400,
  );
  const confidentCoins: Write[] = [];
  writes.map((w: any) => {
    if (
      prevWrites[w.PK.replace("asset#", "").replace("#", ":")]?.confidence >
      0.99
    )
      return;
    confidentCoins.push(w);
  });

  await storeCoinData(confidentCoins);
  await storeHistoricalCoinData(confidentCoins);
  const filteredCoins = coins.filter(
    (coin) => coinData[coin.id]?.usd !== undefined,
  );
  const platformQueries = filteredCoins
    .map((f: Coin) =>
      Object.entries(f.platforms).map((p: any) => {
        const i = Object.values(chainToCoingeckoId).indexOf(p[0]);
        return {
          key: `${Object.keys(chainToCoingeckoId)[i]}:${p[1]}`,
          timestamp: getCurrentUnixTimestamp(),
        };
      }),
    )
    .flat();
  const coinPlatformData = await readCoins2(platformQueries, true, 604800);

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
          const key = PK.replace("asset#", "");
          if (coinPlatformData[key]?.confidence > 0.99) return;
          const timestamp = getCurrentUnixTimestamp();
          const previous = await ddb.get({ PK, SK: 0 });
          const ref = findRef();

          function findRef(): any {
            const dynamoData = previous.Item;
            let pgData: any = coinPlatformData[key];
            if (dynamoData && pgData) {
              ["decimals", "symbol"].map((key) => {
                if (dynamoData[key] && !(key in pgData))
                  pgData[key] = dynamoData[key];
              });
              return dynamoData.confidence > pgData.confidence
                ? dynamoData
                : pgData;
            }
            return dynamoData ?? pgData;
          }

          let decimals: number | undefined = ref?.decimals;
          let symbol: string | undefined = ref?.symbol;
          if (!decimals || !symbol) {
            const data = await getSymbolAndDecimals(
              tokenAddress,
              chain,
              coin.symbol,
            );
            decimals = decimals ?? data?.decimals;
            symbol = symbol ?? data?.symbol ?? coin.symbol;
          }
          if (decimals == undefined || decimals == 0) {
            blacklist.push(PK);
            return;
          }
          if (!pricesAndMcaps[cgPK(coin.id)]) {
            console.error(`[scripts - getAndStoreCoins 2]Couldn't get data for ${coin.id}`);
            return;
          }
          writes2.push({
            key,
            timestamp,
            price: pricesAndMcaps[cgPK(coin.id)].price,
            decimals: decimals,
            symbol: symbol,
            confidence: 0.99,
            adapter: "coingecko",
            mcap: pricesAndMcaps[cgPK(coin.id)].mcap || null,
            chain: key.substring(0, key.indexOf(":")),
          });

          if (previous.Item?.confidence > 0.99) return;
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
    await batchWrite2(
      writes2.filter((c: Coin) => c.symbol != null),
      false,
      undefined,
      "line 329",
    );
  } catch (e) {
    console.error(e);
  }
}

const HOUR = 3600;
async function getAndStoreHourly(
  coin: Coin,
  rejected: Coin[],
  platformData: { [id: string]: string[] },
  toTimestamp: number = getCurrentUnixTimestamp(), // for backfilling
) {
  const fromTimestamp = toTimestamp - (24 * HOUR - 5 * 60); // 24h - 5 mins
  const coinData = await retryCoingeckoRequest(
    `coins/${coin.id}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
    3,
  );
  if (!Array.isArray(coinData.prices)) {
    console.error(`[scripts - getAndStoreHourly] Couldn't get data for ${coin.id}`);
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

  await batchWrite(
    coinData.prices
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

  if (!(coin.id in platformData)) return;
  const writes = coinData.prices
    .filter((price) => {
      const ts = toUNIXTimestamp(price[0]);
      return !writtenTimestamps[ts];
    })
    .map((price) =>
      [cgPK(coin.id), ...platformData[coin.id]].map((PK: string) => ({
        timestamp: toUNIXTimestamp(price[0]),
        key: PK.replace("#", ":"),
        price: price[1],
        confidence: 0.99,
        adapter: "coingecko",
        symbol: coin.symbol,
        chain: PK.substring(0, PK.replace("#", ":").indexOf(":")),
      })),
    )
    .flat();

  const step = 10000;
  for (let i = 0; i < writes.length; i += step) {
    await batchWrite2(writes.slice(i, i + step), false, undefined, "line 416");
  }
}

async function filterCoins(coins: Coin[]): Promise<Coin[]> {
  const str = coins.map((i) => i.id).join(",");
  const coinsData = await retryCoingeckoRequest(
    `simple/price?ids=${str}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true`,
    3,
  );

  return coins.filter((coin) => {
    const coinData = coinsData[coin.id];
    if (!coinData) return false;
    // we fetch chart information only for coins with:
    //   at least 10M marketcap
    //   at least 10M trading volume in last 24 hours
    return coinData.usd_market_cap > 1e7 && coinData.usd_24h_vol > 1e7;
  });
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
    const hourlyCoins: Coin[] = [];
    for (let i = 0; i < coins.length; i += step) {
      let currentCoins = coins.slice(i, i + step);
      currentCoins = await filterCoins(currentCoins);
      hourlyCoins.push(...currentCoins);
    }

    // COMMENTS HERE ARE USEFUL FOR BACKFILLING CG DATA!!!!
    // let start = 1696786585;
    // const timestamps: number[] = [];
    // while (start < 1696877028) {
    //   timestamps.push(start);
    //   start += 3600;
    // }
    // timestamps.push(start + 3600);
    const platformData = await getPlatformData(hourlyCoins);
    // for (let i = 0; i < timestamps.length; i++) {
    await Promise.all(
      hourlyCoins.map(
        (coin) => getAndStoreHourly(coin, rejected, platformData), //, timestamps[i]),
      ),
    );
    // }
  } else {
    for (let i = 0; i < coins.length; i += step) {
      requests.push(getAndStoreCoins(coins.slice(i, i + step), rejected));
    }
    await Promise.all(requests);
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

async function triggerFetchCoingeckoData(hourly: boolean) {
  await cacheSolanaTokens();
  const step = 500;
  const coins = (await fetch(
    `https://pro-api.coingecko.com/api/v3/coins/list?include_platform=true&x_cg_pro_api_key=${process.env.CG_KEY}`,
  ).then((r) => r.json())) as Coin[];
  shuffleArray(coins);
  let promises: Promise<void>[] = [];
  for (let i = 0; i < coins.length; i += step) {
    promises.push(fetchCoingeckoData(coins.slice(i, i + step), hourly, 0));
  }
  await Promise.all(promises);
  process.exit(0);
}

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the hourly bool.
    Eg: ts-node coins/src/scripts/coingecko.ts true`);
  process.exit(1);
} else {
  if (process.argv[2] == "true") triggerFetchCoingeckoData(true);
  triggerFetchCoingeckoData(false);
}
// ts-node coins/src/scripts/coingecko.ts false
