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

const vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const subgraphNames: { [chain: string]: string } = {
  ethereum: "balancer-v2",
  arbitrum: "balancer-arbitrum-v2",
  polygon: "balancer-polygon-v2"
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
export default async function getTokenPrices(chain: string, timestamp: number) {
  let writes: Write[] = [];
  let poolIds: string[];
  let block: number | undefined;
  [poolIds, block] = await Promise.all([
    getPoolIds(chain, timestamp),
    getBlock(chain, timestamp)
  ]);

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
    { withSupply: true, },
  );

  const tokenValues: object[] = await getTokenValues(poolValues, tokenInfos);

  tokenValues.map((v: any) => {
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
  });

  return writes;
}
