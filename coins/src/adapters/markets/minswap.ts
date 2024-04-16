import { Write, Metadata, CoinData } from "../utils/dbInterfaces";
import {
  addToDBWritesList,
  getDbMetadata,
  getTokenAndRedirectData,
} from "../utils/database";
import axios, { AxiosInstance } from "axios";
import { PromisePool, Stoppable } from "@supercharge/promise-pool";

type Value = {
  unit: string;
  quantity: string;
};
type PoolState = {
  assetA: string;
  assetB: string;
  reserveA: number;
  reserveB: number;
};
type PricedTokens = {
  [token: string]: { price: number; reserve: number };
};
type Utxo = {
  amount: Value[];
};

const chain: string = "cardano";
const POOL_ADDRESS_LIST: string[] = [
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq0xmsha",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzfgf0jgfz5xdvg2pges20usxhw8zwnkggheqrxwmxd6huuqss46eh",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzwccf8ywaly0m99ngq68lus48lmafut7ku9geawu8u6k49suv42qq",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz02znpd777wgl9wwpk0dvdzuxn93mqh82q7vv6s9jn25rws52z94g",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2jyskd3y6etkv8ye450545xu6q4jfq5hv4e0uxwkpf8lsq048y90",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxztnqm37tpj0q63s0qns5wfe4flqzqqg55760472n7yt4v8skpaj3k",
];
const api: AxiosInstance = axios.create({
  baseURL: "https://cardano-mainnet.blockfrost.io/api/v0",
  headers: {
    project_id: 'mai'+'nnetcxT8VaeCgVMzMTSe'+'zZijWlVkyh6XytpS',
    "Content-Type": "application/json",
  },
  timeout: 300000,
});
let calls: number = 0;
export function minswap(timestamp: number) {
  console.log("starting minswap");
  return getTokenPrices(timestamp);
}
function normalizeAssets(a: string, b: string): [string, string] {
  if (a === "lovelace") {
    return [a, b];
  }
  if (b === "lovelace") {
    return [b, a];
  }
  if (a < b) {
    return [a, b];
  } else {
    return [b, a];
  }
}
function translateUtxo(value: Value[]): PoolState {
  let assetA: string;
  let assetB: string;

  const FACTORY_POLICY_ID: string =
    "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f";
  const POOL_NFT_POLICY_ID: string =
    "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb1";

  const nft = value.find(({ unit }) => unit.startsWith(POOL_NFT_POLICY_ID));
  if (!nft) throw new Error("pool doesnt have nft");
  const poolId = nft.unit.slice(56);

  const relevantAssets = value.filter(
    (v: Value) =>
      !v.unit.startsWith(FACTORY_POLICY_ID) && !v.unit.endsWith(poolId),
  );

  switch (relevantAssets.length) {
    case 2: {
      // ADA/A pool
      assetA = "lovelace";
      const nonADAAssets = relevantAssets.filter(
        (v: Value) => v.unit !== "lovelace",
      );
      assetB = nonADAAssets[0].unit;
      break;
    }
    case 3: {
      // A/B pool
      const nonADAAssets = relevantAssets.filter(
        (v: Value) => v.unit !== "lovelace",
      );
      [assetA, assetB] = normalizeAssets(
        nonADAAssets[0].unit,
        nonADAAssets[1].unit,
      );
      break;
    }
    default:
      throw new Error(
        "pool must have 2 or 3 assets except factory, NFT and LP tokens",
      );
  }

  const reserveA: number =
    Number(value.find((v: Value) => v.unit === assetA)?.quantity) ?? 0;
  const reserveB: number =
    Number(value.find((v: Value) => v.unit === assetB)?.quantity) ?? 0;

  return {
    assetA,
    assetB,
    reserveA,
    reserveB,
  };
}
async function getUtxos(addressList: string, page: number): Promise<any> {
  calls += 1;
  return api.get(`addresses/${addressList}/utxos`, {
    params: {
      searchParams: {
        page,
        order: "desc",
      },
    },
  });
}
async function getPools(): Promise<PoolState[]> {
  let pools: PoolState[] = [];

  async function appendToPoolsList(
    addressList: string,
    page: number,
    pool: Stoppable,
  ): Promise<void> {
    const res: Utxo[] = (await getUtxos(addressList, page)).data;
    if (res.length === 0) return pool.stop(); // last page

    res.map((utxo: Utxo) => {
      try {
        pools.push(translateUtxo(utxo.amount));
      } catch {}
    });
  }

  const maxIteration: number = 1e2;
  for (let i = 0; i < POOL_ADDRESS_LIST.length; i++) {
    await PromisePool.withConcurrency(20)
      .for(Array(maxIteration).fill(POOL_ADDRESS_LIST[i]))
      .process(async (a, j, p) => appendToPoolsList(a, j, p));
  }

  return pools;
}
function listPoolAssets(pools: PoolState[]): string[] {
  const assets: string[] = [];

  pools.map((p: PoolState) => {
    assets.push(...[p.assetA, p.assetB]);
  });

  return [...new Set(assets)];
}
async function getAssetMetadata(assets: string[]): Promise<Metadata> {
  const metadata: Metadata = await getDbMetadata(assets, chain);
  const knownTokenAddresses: string[] = Object.keys(metadata);

  for (let asset of assets) {
    if (knownTokenAddresses.includes(asset)) continue;

    calls += 1;
    const { data: res }: any = await api.get(`assets/${asset}`);
    if (!res.metadata || !res.metadata.ticker) continue;

    metadata[asset] = {
      symbol: res.metadata.ticker,
      decimals: res.metadata.decimals ?? 0,
    };
  }

  return metadata;
}
function calculateRatio(
  pool: PoolState,
  tokenData: { decimals: number; symbol: string },
  unknownToken: "A" | "B",
): { ratio: number | undefined; reserve: number | undefined } {
  const unknownReserve: number = <number>(
    pool[`reserve${unknownToken}` as keyof PoolState]
  );
  const knownReserve: number = <number>(
    pool[`reserve${unknownToken == "A" ? "B" : "A"}` as keyof PoolState]
  );
  if (!unknownReserve || !knownReserve)
    return { ratio: undefined, reserve: undefined };

  const shift: number = 10 ** (tokenData.decimals - 6);

  return {
    ratio: (knownReserve * shift) / unknownReserve,
    reserve: unknownReserve,
  };
}
function priceTokensThroughPoolWeights(
  pools: PoolState[],
  pricedTokens: PricedTokens,
  metadata: Metadata,
  writes: Write[],
  timestamp: number,
) {
  for (let i = 0; i < 3; i++) {
    pools.map((p: PoolState, j: number) => {
      let token: string;

      if (p.assetA in pricedTokens) {
        if (p.assetB in pricedTokens) return;
        token = p.assetB;
      } else if (p.assetB in pricedTokens) {
        token = p.assetA;
      } else {
        return;
      }

      const unknownToken: "A" | "B" = p.assetA == token ? "A" : "B";
      if (!(token in metadata)) return;

      const tokenData: { decimals: number; symbol: string } =
        metadata[token as keyof Metadata];

      const { ratio, reserve } = calculateRatio(p, tokenData, unknownToken);
      if (!ratio || !reserve) return;

      const price: number =
        pricedTokens[
          p[
            `asset${unknownToken == "A" ? "B" : "A"}` as keyof PoolState
          ] as keyof typeof pricedTokens
        ].price * ratio;

      if (token in pricedTokens && reserve < pricedTokens[token].reserve)
        return;

      pricedTokens[token] = { price, reserve };

      addToDBWritesList(
        writes,
        chain,
        token,
        price,
        tokenData.decimals,
        tokenData.symbol,
        timestamp,
        "minswap",
        0.9,
      );

      pools.splice(j, 1);
    });
  }
}
async function getTokenPrices(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];

  const basePrice: CoinData[] = await getTokenAndRedirectData(
    ["cardano"],
    "coingecko",
    timestamp,
  );
  const cardanoPrice: number = basePrice[0].price;
  const pricedTokens: PricedTokens = {
    lovelace: { price: cardanoPrice, reserve: 100000000000 },
  };

  const pools: PoolState[] = await getPools();
  const assets: string[] = listPoolAssets(pools);
  const metadata: Metadata = await getAssetMetadata(assets);

  priceTokensThroughPoolWeights(
    pools,
    pricedTokens,
    metadata,
    writes,
    timestamp,
  );

  function appendAdaPrices() {
    addToDBWritesList(
      writes,
      chain,
      "0x0000000000000000000000000000000000000000",
      cardanoPrice,
      6,
      "ADA",
      timestamp,
      "minswap",
      0.9,
    );
    addToDBWritesList(
      writes,
      chain,
      "lovelace",
      cardanoPrice,
      6,
      "ADA",
      timestamp,
      "minswap",
      0.9,
    );
  }

  appendAdaPrices();

  console.log(`${calls} bitfrost calls were made`);
  return writes;
}
