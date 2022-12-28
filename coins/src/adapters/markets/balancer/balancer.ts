import { multiCall } from "@defillama/sdk/build/abi/index";
import { request, gql } from "graphql-request";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { Write, CoinData } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";
import abi from "./abi.json";
import { getTokenInfo } from "../../utils/erc20";
import { Result } from "../../utils/sdkInterfaces";

const vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const nullAddress = "0x0000000000000000000000000000000000000000";
const subgraphNames: { [chain: string]: string } = {
  ethereum: "balancer-v2",
  arbitrum: "balancer-arbitrum-v2",
  polygon: "balancer-polygon-v2"
};
const gaugeFactories: { [chain: string]: string } = {
  ethereum: "0x4e7bbd911cf1efa442bc1b2e9ea01ffe785412ec",
  arbitrum: "0xb08e16cfc07c684daa2f93c70323badb2a6cbfd2",
  polygon: "0x3b8ca519122cdd8efb272b0d3085453404b25bd0"
};
async function getPoolIds(chain: string, timestamp: number) {
  let addresses: string[] = [];
  let reservereThreshold: Number = 0;
  const subgraph = `https://api.thegraph.com/subgraphs/name/balancer-labs/${
    subgraphNames[chain] || chain
  }`;
  for (let i = 0; i < 20; i++) {
    const lpQuery = gql`
    query {
      pools (first: 1000, orderBy: totalLiquidity, orderDirection: desc,
          where: {${
            i == 0
              ? ``
              : `totalLiquidity_lt: ${Number(reservereThreshold).toFixed(4)}`
          } ${
      timestamp == 0 ? `` : `createTime_gt: ${(timestamp * 1000).toString()}`
    }}) {
        id
        totalLiquidity
      }
    }`;
    const result = (await request(subgraph, lpQuery)).pools;
    if (result.length < 1000) i = 20;
    if (result.length == 0) return addresses;
    reservereThreshold = result[Math.max(result.length - 1, 0)].totalLiquidity;
    addresses.push(...result.map((p: any) => p.id));
  }
  return addresses;
}
async function getPoolTokens(
  chain: string,
  block: number | undefined,
  poolIds: string[]
) {
  return (
    await multiCall({
      abi: abi.getPoolTokens,
      calls: poolIds.map((p: string) => ({
        target: vault,
        params: p
      })),
      chain: chain as any,
      block
    })
  ).output.map((c: any) => c.output);
}
function findAllUniqueTokens(poolTokens: any[]) {
  const uniqueTokens: string[] = [];
  poolTokens.map((p: any) => {
    p.tokens.map((t: string) => {
      if (uniqueTokens.includes(t.toLowerCase())) return;
      uniqueTokens.push(t.toLowerCase());
    });
  });
  return uniqueTokens;
}
async function getPoolValues(
  chain: string,
  timestamp: number,
  poolTokens: any[],
  poolIds: string[]
) {
  const uniqueTokens: string[] = findAllUniqueTokens(poolTokens);
  const coinsData: CoinData[] = await getTokenAndRedirectData(
    uniqueTokens,
    chain,
    timestamp
  );
  const poolTokenValues: any = [];
  poolTokens.map((p: any, i: number) => {
    poolTokenValues.push([]);
    p.tokens.map((t: string, j: number) => {
      if (poolIds[i].includes(t.toLowerCase())) {
        poolTokenValues[i].push(0);
        return;
      }

      const tData = coinsData.find((d: any) => d.address == t.toLowerCase());
      if (tData == undefined) {
        poolTokenValues[i].push(undefined);
        return;
      }

      const { decimals, price } = tData;
      const tokenValue = (p.balances[j] * price) / 10 ** decimals;
      poolTokenValues[i].push(tokenValue);
    });
  });

  const poolTotalValues: { [poolId: string]: number } = {};
  poolTokenValues.map((p: any[], i: any) => {
    if (p.includes(undefined)) return;
    const totalValue = p.reduce((p: number, c: number) => p + c, 0);
    poolTotalValues[poolIds[i]] = totalValue;
  });

  return poolTotalValues;
}
function getTokenValues(poolValues: object, poolInfos: any) {
  const tokenValues: object[] = [];
  poolInfos.supplies.map((s: any, i: number) => {
    const poolValue = Object.entries(poolValues).filter(
      (v: any) => v[0].substring(0, 42) == s.input.target
    );

    if (poolValue.length == 0) return;
    const price =
      (poolValue[0][1] * 10 ** poolInfos.decimals[i].output) / s.output;
    if (isNaN(price)) return;

    tokenValues.push({
      address: s.input.target,
      price,
      decimals: poolInfos.decimals[i].output,
      symbol: poolInfos.symbols[i].output
    });
  });
  return tokenValues;
}
async function getLpPrices(chain: string, timestamp: number, block: number) {
  const poolIds: string[] = await getPoolIds(chain, timestamp);
  const poolTokens: number[] = await getPoolTokens(chain, block, poolIds);
  const poolValues: object = await getPoolValues(
    chain,
    timestamp,
    poolTokens,
    poolIds
  );

  const tokenInfos = await getTokenInfo(
    chain,
    poolIds.map((p: string) => p.substring(0, 42)),
    block,
    { withSupply: true }
  );

  return getTokenValues(poolValues, tokenInfos);
}

export default async function getTokenPrices(chain: string, timestamp: number) {
  let writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const tokenValues: object[] = await getLpPrices(chain, timestamp, block);
  const gauges: string[] = (
    await multiCall({
      target: gaugeFactories[chain],
      block,
      chain,
      calls: tokenValues
        .map((t: any) => t.address)
        .map((l: string) => ({
          params: [l]
        })),
      abi: abi.getPoolGauge
    })
  ).output.map((o: Result) => o.output);

  tokenValues.map((v: any, i: number) => {
    addToDBWritesList(
      writes,
      chain,
      v.address,
      v.price,
      v.decimals,
      v.symbol,
      timestamp,
      "balancer-lp",
      0.9
    );
    if (gauges[i] == nullAddress) return;
    addToDBWritesList(
      writes,
      chain,
      gauges[i],
      undefined,
      v.decimals,
      `${v.symbol}-gauge`,
      timestamp,
      "balancer-gauge",
      0.9,
      `asset#${chain}:${v.address}`
    );
  });

  return writes;
}
