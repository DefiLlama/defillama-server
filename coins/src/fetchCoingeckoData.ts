import fetch from "node-fetch";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { getCoingeckoLock, setTimer } from "./utils/shared/coingeckoLocks";
import ddb, { batchWrite, batchGet } from "./utils/shared/dynamodb";
import { getCoinPlatformData } from "./utils/coingeckoPlatforms";
import { cgPK } from "./utils/keys";
import { decimals, symbol } from "@defillama/sdk/build/erc20";
import invokeLambda from "./utils/shared/invokeLambda";
import sleep from "./utils/shared/sleep";
import { Coin, iterateOverPlatforms } from "./utils/coingeckoPlatforms";
import { getCurrentUnixTimestamp, toUNIXTimestamp } from "./utils/date";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Write } from "./adapters/utils/dbInterfaces";
import { filterWritesWithLowConfidence } from "./adapters/utils/database";
import { batchWrite2 } from "../coins2";
import setEnvSecrets from "../../defi/src/utils/shared/setEnvSecrets";

let solanaConnection = new Connection(
  process.env.SOLANA_RPC || "https://rpc.ankr.com/solana",
);

export async function retryCoingeckoRequest(
  query: string,
  retries: number,
): Promise<CoingeckoResponse> {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      return await fetch(
        `https://api.coingecko.com/api/v3/${query}`,
      ).then((r) => r.json());
    } catch {
      try {
        return await fetch(
          `https://pro-api.coingecko.com/api/v3/${query}&x_cg_pro_api_key=${process.env.CG_KEY}`,
        ).then((r) => r.json());
      } catch (e) {
        if ((i + 1) % 3 === 0 && retries > 3) {
          await sleep(10e3); // 10s
        }
        continue;
      }
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
      key: c.PK,
      timestamp: c.SK,
      price: c.price,
      confidence: c.confidence,
      symbol: c.symbol,
      adapter: "coingecko",
    });
  });
  try {
    await batchWrite2(writes2, false, 5 * 60, 'fetchCGD 75');
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
    await batchWrite2(writes2, false, 5 * 60, 'fetchCGD 105');
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
async function getSymbolAndDecimals(
  tokenAddress: string,
  chain: string,
  coingeckoSymbol: string,
) {
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
    throw new Error(
      `Token ${chain}:${tokenAddress} is not on solana or EVM so we cant get token data yet`,
    );
  } else {
    try {
      return {
        symbol: (await symbol(tokenAddress, chain as any)).output,
        decimals: Number((await decimals(tokenAddress, chain as any)).output),
      };
    } catch (e) {
      throw new Error(
        `ERC20 methods aren't working for token ${chain}:${tokenAddress}`,
      );
    }
  }
}

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
      console.error(`[getAndStoreCoins] Couldn't get data for ${coin.id}`);
      rejected.push(coin);
    }
    idToSymbol[coin.id] = coin.symbol;
  });
  const timestamp = getCurrentUnixTimestamp();
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
  const confidentCoins = await filterWritesWithLowConfidence(writes, 1);
  await storeCoinData(confidentCoins);
  await storeHistoricalCoinData(confidentCoins);
  const filteredCoins = coins.filter(
    (coin) => coinData[coin.id]?.usd !== undefined,
  );
  const coinPlatformData = await getCoinPlatformData(filteredCoins);

  const prices: { [key: string]: number } = {};
  confidentCoins.map((c: Write) => {
    if (!c.price) return;
    prices[c.PK] = c.price;
  });
  const writes2: any[] = [];
  await Promise.all(
    filteredCoins.map(async (coin) =>
      iterateOverPlatforms(
        coin,
        async (PK, tokenAddress, chain) => {
          const previous = await ddb.get({ PK, SK: 0 });
          if (previous.Item?.confidence > 0.99) return;

          const { decimals, symbol } = await getSymbolAndDecimals(
            tokenAddress,
            chain,
            coin.symbol,
          );

          writes2.push({
            key: PK,
            timestamp: getCurrentUnixTimestamp(),
            price: prices[cgPK(coin.id)],
            decimals: decimals,
            symbol: symbol,
            confidence: 0.99,
            adapter: "coingecko",
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
    await batchWrite2(writes2, undefined, undefined, 'fetchCGD 256');
  } catch (e) {
    console.error(e);
  }
}

const HOUR = 3600;
async function getAndStoreHourly(coin: Coin, rejected: Coin[]) {
  const toTimestamp = getCurrentUnixTimestamp();
  const fromTimestamp = toTimestamp - (24 * HOUR - 5 * 60); // 24h - 5 mins
  const coinData = await retryCoingeckoRequest(
    `coins/${coin.id}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
    3,
  );
  if (!Array.isArray(coinData.prices)) {
    console.error(`[getAndStoreHourly] Couldn't get data for ${coin.id}`);
    rejected.push(coin);
    return;
  }
  const PK = cgPK(coin.id);
  const prevWritenItems = await batchGet(
    coinData.prices.map((price) => ({
      SK: toUNIXTimestamp(price[0]),
      PK,
    })),
  );
  const writtenTimestamps = prevWritenItems.reduce((all, item) => {
    all[item.SK] = true;
    return all;
  }, {});

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

const step = 80;

const handler = (hourly: boolean) => async (
  event: any,
  _context: AWSLambda.Context,
) => {
  const coins = event.coins as Coin[];
  const depth = event.depth as number;
  const rejected = [] as Coin[];
  const timer = setTimer();
  const requests = [];
  await setEnvSecrets();
  if (hourly) {
    const hourlyCoins = [];
    for (let i = 0; i < coins.length; i += step) {
      let currentCoins = coins.slice(i, i + step);
      currentCoins = await filterCoins(currentCoins);
      hourlyCoins.push(...currentCoins);
    }
    await Promise.all(
      hourlyCoins.map((coin) => getAndStoreHourly(coin, rejected)),
    );
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
      await invokeLambda(
        hourly
          ? `coins-prod-fetchHourlyCoingeckoData2`
          : `coins-prod-fetchCoingeckoData2`,
        {
          coins: rejected,
          depth: depth + 1,
        },
      );
    }
  }
};

/*
function getMetadataPDA(mint: PublicKey) {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), mint.toBuffer()],
    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );
  return publicKey;
}
*/

export const fetchCoingeckoData = wrapScheduledLambda(handler(false));
export const fetchHourlyCoingeckoData = wrapScheduledLambda(handler(true));
