import { log } from "@defillama/sdk";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import axios from "axios";

const SMR = "0x1074010000000000000000000000000000000000";
const graphEndpoint =
  "https://shimmer.subgraph.tangleswap.space/subgraphs/name/tangleswap/shimmer-v3";
const query = `{
  tokens(
    orderBy: volumeUSD
    orderDirection: desc
    where: {totalValueLocked_gt: 2000}
  ) {
    id
    decimals
    symbol
    name
    derivedETH
    untrackedVolumeUSD
    txCount
    poolCount
    whitelistPools(
      where: {and: [{or: [{token0: "${SMR}"}, {token1: "${SMR}"}]}, {totalValueLockedUSD_gt: 2000}]}
    ) {
      id
      token0 { id }
      token1 { id }
      liquidity
      totalValueLockedETH
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      txCount
    }
  }
}`;

export function tangleswap(timestamp: number) {
  console.log("starting tangleswap");

  const THIRY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRY_MINUTES)
    throw new Error("Can't fetch historical data");

  return Promise.all([getTokenPrices(timestamp)]);
}
const chain = "shimmer_evm";

async function getPools() {
  const pools = [] as any;
  const {
    data: {
      data: { tokens },
    },
  } = await axios.post(graphEndpoint, {
    query,
    operationName: "",
    variables: {},
  });
  log("tangleswap", tokens.length);
  tokens.forEach((i: any) => {
    if (i.id === SMR) return;
    const includeToken = i.whitelistPools?.some((i: any) => {
      const smrBal =
        i.token0.id === SMR
          ? i.totalValueLockedToken0
          : i.totalValueLockedToken1;
      if (smrBal < 13000) return;
      if (smrBal * 7 < i.totalValueLockedETH) return;
      return true;
    });
    if (includeToken) pools.push(i);
  });
  log("pools", pools.length);
  return pools;
}

async function getTokenPrices(timestamp: number) {
  const [coinData] = await getTokenAndRedirectData([SMR], chain, timestamp);

  const writes: Write[] = [];
  if (!coinData) return writes;

  let pools = await getPools();
  pools.forEach(({ id, derivedETH, decimals, symbol }: any) => {
    const price = derivedETH * coinData.price;
    addToDBWritesList(
      writes,
      chain,
      id,
      price,
      decimals,
      symbol,
      timestamp,
      "tangleswap",
      0.9,
    );
  });
  return writes;
}
