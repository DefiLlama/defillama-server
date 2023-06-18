import { Write, Metadata, CoinData } from "../utils/dbInterfaces";
import {
  addToDBWritesList,
  getDbMetadata,
  getTokenAndRedirectData,
} from "../utils/database";
import axios, { AxiosInstance } from "axios";
import { PoolState } from "@minswap/blockfrost-adapter";

type Value = {
  unit: string;
  quantity: string;
};

type PoolState2 = {
  assetA: string;
  assetB: string;
  reserveA: bigint;
  reserveB: bigint;
};
const POOL_ADDRESS_LIST: string[] = [
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq0xmsha",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzfgf0jgfz5xdvg2pges20usxhw8zwnkggheqrxwmxd6huuqss46eh",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzwccf8ywaly0m99ngq68lus48lmafut7ku9geawu8u6k49suv42qq",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz02znpd777wgl9wwpk0dvdzuxn93mqh82q7vv6s9jn25rws52z94g",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2jyskd3y6etkv8ye450545xu6q4jfq5hv4e0uxwkpf8lsq048y90",
  "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxztnqm37tpj0q63s0qns5wfe4flqzqqg55760472n7yt4v8skpaj3k",
];
const POOL_NFT_POLICY_ID: string =
  "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb1";
export const FACTORY_POLICY_ID: string =
  "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f";
const chain: string = "cardano";

export function minswap(timestamp: number) {
  console.log("starting minswap");
  return Promise.all([getTokenPrices(timestamp)]);
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

function translateUtxo(value: Value[]) {
  let assetA: string;
  let assetB: string;
  let reserveA: number;
  let reserveB: number;
  const nft = value.find((v: Value) => v.unit.startsWith(POOL_NFT_POLICY_ID));
  if (!nft) return;
  const poolId = nft.unit.slice(56);
  // validate and memoize assetA and assetB
  const relevantAssets = value.filter(
    (v: Value) =>
      !v.unit.startsWith(FACTORY_POLICY_ID) && // factory token
      !v.unit.endsWith(poolId), // NFT and LP tokens from profit sharing
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
  reserveA = Number(value.find((v: Value) => v.unit === assetA)?.quantity) ?? 0;
  reserveB = Number(value.find((v: Value) => v.unit === assetB)?.quantity) ?? 0;

  return {
    assetA,
    assetB,
    reserveA,
    reserveB,
  };
}

async function getPools(api: any): Promise<PoolState[]> {
  let pools: PoolState[] = [];
  for (let i = 1; i < 2; i++) {
    const { data: res }: any = await api.get(
      `addresses/${POOL_ADDRESS_LIST[0]}/utxos`,
      {
        params: {
          searchParams: {
            page: i,
            count: 100,
            order: "asc",
          },
        },
      },
    );

    if (res.length === 0) return pools; // last page

    res.map((utxo: any) => {
      try {
        pools.push(
          new PoolState(
            { txHash: utxo.tx_hash, index: utxo.output_index },
            utxo.amount,
            utxo.data_hash,
          ),
        );
      } catch {}
    });
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
async function getAssetMetadata(api: any, assets: string[]): Promise<Metadata> {
  const metadata: Metadata = await getDbMetadata(assets, chain);
  const knownTokenAddresses: string[] = Object.keys(metadata);
  for (let asset of assets) {
    if (knownTokenAddresses.includes(asset)) continue;
    const { data: res }: any = await api.get(`assets/${asset}`);
    if (!res.metadata || !res.metadata.ticker || !res.metadata.decimals)
      continue;
    metadata[asset] = {
      symbol: res.metadata.ticker,
      decimals: res.metadata.decimals,
    };
  }
  return metadata;
}
function calculateRatio(
  pool: PoolState,
  tokenData: { decimals: number; symbol: string },
  unknownToken: "A" | "B",
): number | undefined {
  const unknownReserve: number = Number(
    pool[`reserve${unknownToken}` as keyof PoolState],
  );
  const knownReserve: number = Number(
    pool[`reserve${unknownToken == "A" ? "B" : "A"}` as keyof PoolState],
  );
  const shift: number = 10 ** (tokenData.decimals - 6);
  if (!unknownReserve || !knownReserve) return undefined;

  return (unknownReserve * shift) / knownReserve;
}
async function getTokenPrices(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];

  const api: AxiosInstance = axios.create({
    baseURL: "https://cardano-mainnet.blockfrost.io/api/v0",
    headers: {
      project_id: "mainnet9mqP0lhGpRfqcUnVjOFaTSK67Z9UdZMM",
      "Content-Type": "application/json",
    },
    timeout: 300000,
  });

  const basePrice: CoinData[] = await getTokenAndRedirectData(
    ["cardano"],
    "coingecko",
    timestamp,
  );
  const cardanoPrice: number = basePrice[0].price;
  const pricedTokens: { [token: string]: number } = { lovelace: cardanoPrice };

  const pools: PoolState[] = await getPools(api);
  const assets: string[] = listPoolAssets(pools);
  const metadata: Metadata = await getAssetMetadata(api, assets);

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

      const ratio: number | undefined = calculateRatio(
        p,
        tokenData,
        unknownToken,
      );
      if (!ratio) return;

      const price: number =
        pricedTokens[
          p[
            `asset${unknownToken == "A" ? "B" : "A"}` as keyof PoolState
          ] as keyof typeof pricedTokens
        ] * ratio;
      pricedTokens[token] = price;

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

  return writes;
}
