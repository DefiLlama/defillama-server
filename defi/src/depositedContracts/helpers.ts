import PromisePool from "@supercharge/promise-pool";
import { CoinData, RawDeposits, ReadableDeposit } from "./types";
import { explorers } from "./constants";
import providers from "@defillama/sdk/build/providers.json";

const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

async function get(
  endpoint: string,
  params?: { query?: { [param: string]: string }; body?: BodyInit; method?: "get" | "post" }
) {
  const { query, body, method } = params ?? {};
  let url = endpoint;
  if (query) {
    url += "?";
    Object.keys(query).map((p) => (url += `${p}=${query[p]}&`));
  }
  const res = await fetch(url, { method, body });
  return await res.json();
}
export async function fetchTransfers(addresses: string): Promise<{ [chain: string]: any[] }> {
  const allTransfers: { [chain: string]: any[] } = {};
  await PromisePool.withConcurrency(5)
    .for(Object.keys(explorers))
    .process(async (chainId) => {
      const chainSlug: string = chainIdMap[chainId as any];
      let offset: number = 0;
      allTransfers[chainSlug] = [];

      let transfers: any = { length: 1000 };
      while (transfers.length == 1000) {
        console.time(`transfer ${chainId}`);
        transfers = (
          await get(`https://peluche.llamao.fi/token-transfers`, {
            query: {
              chainId: `${chainId}`,
              addresses,
              from_address: "true",
              to_address: "true",
              limit: "1000",
              offset: `${offset}`,
            },
          })
        ).transfers;

        console.timeEnd(`transfer ${chainId}`);
        allTransfers[chainSlug].push(...transfers);
        offset += 1000;
      }
    });

  return allTransfers;
}
export async function filterDeposits(
  allTransfers: { [chain: string]: any[] },
  addresses: string[]
): Promise<RawDeposits> {
  let allRawDeposits: RawDeposits = {};
  await Promise.all(
    Object.keys(allTransfers).map(async (chain: string) => {
      let rawDeposits: RawDeposits = {};
      allTransfers[chain].map((t: any) => {
        const { to_address: to, from_address: from } = t;
        if (addresses.includes(from) && !(to in rawDeposits)) rawDeposits[to] = t;
        else if (addresses.includes(to) && from in rawDeposits) delete rawDeposits[from];
      });

      let rpcIndex: number = 0;
      await PromisePool.withConcurrency(5)
        .for(Object.keys(rawDeposits))
        .process(async (target) => {
          async function rpcCall(index: number) {
            const rpc = providers[chain as keyof typeof providers].rpc[index];
            const res = await get(rpc, {
              method: "post",
              body: JSON.stringify({
                method: "eth_getCode",
                params: [target, "latest"],
                id: 1,
                jsonrpc: "2.0",
              }),
            });
            if (res.result != "0x") {
              allRawDeposits[`${chain}:${target}`] = rawDeposits[target];
            }
          }

          try {
            await rpcCall(rpcIndex);
          } catch (e) {
            try {
              rpcIndex += 1;
              await rpcCall(rpcIndex);
            } catch (e) {
              throw new Error(`rpcs failed with ${e}`);
            }
          }
        });
    })
  );

  return allRawDeposits;
}
export async function fetchPrices(deposits: RawDeposits): Promise<{ [key: string]: CoinData }> {
  const burl = "https://coins.llama.fi/prices/current/";
  const queries = [];
  let query = burl;

  const priceQueries: string[] = [
    ...new Set(Object.values(deposits).map((f: any) => `${chainIdMap[f.chain]}:${f.token}`)),
  ];

  for (const key of priceQueries) {
    if (query.length + key.length > 1900) {
      queries.push(`${query.slice(0, -1)}?apikey=${process.env.COINS_KEY}`);
      query = burl;
    }
    query += `${key},`;
  }

  const responses: { [key: string]: CoinData }[] = [];
  queries.push(query.slice(0, -1));
  const { errors } = await PromisePool.withConcurrency(5)
    .for(queries)
    .process(async (query) => {
      responses.push((await get(query)).coins);
    });

  if (errors.length) throw new Error(errors[0].message);

  let coinData: { [key: string]: CoinData } = {};
  responses.map((r: { [key: string]: CoinData }) => {
    coinData = { ...coinData, ...r };
  });

  return coinData;
}
export function parseDeposits(
  rawDeposits: RawDeposits,
  coinsData: { [key: string]: CoinData },
  threshold: number = 1
): ReadableDeposit[] {
  const readableDeposits: ReadableDeposit[] = [];
  Object.keys(rawDeposits).map((d: string) => {
    const { token, value, chain: chainId, timestamp, transaction_hash } = rawDeposits[d];
    const chain = chainIdMap[chainId];
    const key = `${chain}:${token}`;

    const coinData: CoinData = coinsData[key];
    if (!coinData) return;

    const usdValue = (coinData.price * value) / 10 ** coinData.decimals;
    if (usdValue < threshold) return;

    readableDeposits.push({
      usdValue: usdValue.toFixed(0),
      symbol: coinData.symbol.toUpperCase(),
      chain,
      timestamp,
      url: `${explorers[chainId]}${transaction_hash}`,
    });
  });

  return readableDeposits;
}
