import { multiCall } from "@defillama/sdk/build/abi/index";
import { request, gql } from "graphql-request";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { Write, CoinData } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";
import abi from "./abi.json";
import { getTokenInfo } from "../../utils/erc20";
import { Result } from "../../utils/sdkInterfaces";
import { DbTokenInfos } from "../../utils/dbInterfaces";

const vault: string = "0x7F51AC3df6A034273FB09BB29e383FCF655e473c";
const nullAddress: string = "0x0000000000000000000000000000000000000000";
const subgraphNames: {
  [chain: string]: {
    pool: string;
    gauge: string
  }
} = {
  pulse: {
    pool: "pools-v3",
    gauge: "gauges"
  }
};
type GqlResult = {
  id: string;
  totalLiquidity: string;
};
type GqlGaugeResult = {
  address: string;
  gauges: [{
    id: string;
  }]
};
type PoolInfo = {
  balances: number[];
  tokens: string[];
};
export type TokenValues = {
  address: string;
  decimals: number;
  price: number;
  symbol: string;
};
async function getPoolIds(_chain: string, timestamp: number): Promise<string[]> {
  let addresses: string[] = [];
  let reservereThreshold: number = 0;
  const subgraph: string = `https://sub5.phatty.io/subgraphs/name/phux/pools-v3`;
  for (let i = 0; i < 20; i++) {
    const lpQuery = gql`
    query {
      pools (first: 1000, orderBy: totalLiquidity, orderDirection: desc,
          where: {${i == 0 ? `` : `totalLiquidity_lt: ${reservereThreshold.toFixed(4)}`
      } ${timestamp == 0 ? `` : `createTime_gt: ${(timestamp * 1000).toString()}`
      }}) {
        id
        totalLiquidity
      }
    }`;
    const res: any = await request(subgraph, lpQuery);
    const result: GqlResult[] = res.pools;
    if (result.length < 1000) i = 20;
    if (result.length == 0) return addresses;
    reservereThreshold = Number(
      result[Math.max(result.length - 1, 0)].totalLiquidity,
    );
    addresses.push(...result.map((p: any) => p.id));
  }
  return addresses;
}
async function getGauges(_chain: string): Promise<GqlGaugeResult[]> {
  let poolGauges: GqlGaugeResult[] = [];
  const subgraph: string = `https://sub5.phatty.io/subgraphs/name/phux/gauges`;
  let skip = 0;
  for (let i = 0; i < 20; i++) {
    const lpQuery = gql`
    query {
      pools (first: 1000, skip: ${skip}) {
        address
        gauges {
          id
        }
      }
    }`;
    const res: any = await request(subgraph, lpQuery);
    const result: GqlGaugeResult[] = res.pools;

    poolGauges.push(...result);

    if (result.length < 1000) {
      break;
    }
    skip += 1000;
  }

  return poolGauges;
}
async function getPoolTokens(
  chain: any,
  block: number | undefined,
  poolIds: string[],
): Promise<PoolInfo[]> {
  return (
    await multiCall({
      abi: abi.getPoolTokens,
      calls: poolIds.map((p: string) => ({
        target: vault,
        params: p,
      })),
      chain,
      block,
    })
  ).output.map((c: Result) => ({
    tokens: c.output.tokens,
    balances: c.output.balances,
  }));
}
function findAllUniqueTokens(poolTokens: PoolInfo[]): string[] {
  const uniqueTokens: string[] = [];
  poolTokens.map((p: PoolInfo) => {
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
  poolTokens: PoolInfo[],
  poolIds: string[],
): Promise<{ [poolId: string]: number }> {
  const uniqueTokens: string[] = findAllUniqueTokens(poolTokens);
  const coinsData: CoinData[] = await getTokenAndRedirectData(
    uniqueTokens,
    chain,
    timestamp,
  );
  const poolTokenValues: number[][] = [];
  poolTokens.map((p: PoolInfo, i: number) => {
    poolTokenValues.push([]);
    p.tokens.map((t: string, j: number) => {
      if (poolIds[i].includes(t.toLowerCase())) {
        poolTokenValues[i].push(0);
        return;
      }

      const tData = coinsData.find(
        (d: CoinData) => d.address == t.toLowerCase(),
      );
      if (tData == undefined) {
        poolTokenValues[i].push(-1);
        return;
      }

      const { decimals, price } = tData;
      const tokenValue: number = (p.balances[j] * price) / 10 ** decimals;
      poolTokenValues[i].push(tokenValue);
    });
  });

  const poolTotalValues: { [poolId: string]: number } = {};
  poolTokenValues.map((p: number[], i: number) => {
    if (p.includes(-1)) return;
    const totalValue: number = p.reduce((p: number, c: number) => p + c, 0);
    poolTotalValues[poolIds[i]] = totalValue;
  });

  return poolTotalValues;
}
function getTokenValues(
  poolValues: { [poolId: string]: number },
  poolInfos: any,
): TokenValues[] {
  const tokenValues: TokenValues[] = [];
  poolInfos.supplies.map((s: Result, i: number) => {
    const poolValue = Object.entries(poolValues).filter(
      (v: any[]) => v[0].substring(0, 42) == s.input.target,
    );

    if (poolValue.length == 0) return;
    const price: number =
      (poolValue[0][1] * 10 ** poolInfos.decimals[i].output) / s.output;
    if (isNaN(price)) return;

    tokenValues.push({
      address: s.input.target,
      price,
      decimals: poolInfos.decimals[i].output,
      symbol: poolInfos.symbols[i].output,
    });
  });
  return tokenValues;
}
export async function getLpPrices(
  poolIds: string[],
  chain: string,
  timestamp: number,
  block: number | undefined,
  supplyAbi: any = abi.getActualSupply,
): Promise<TokenValues[]> {
  const poolTokens: PoolInfo[] = await getPoolTokens(chain, block, poolIds);
  const poolValues: { [poolId: string]: number } = await getPoolValues(
    chain,
    timestamp,
    poolTokens,
    poolIds,
  );

  let tokenInfos: DbTokenInfos = await getTokenInfo(
    chain,
    poolIds.map((p: string) => p.substring(0, 42)),
    block,
    { withSupply: true },
  );

  const calls: { [target: string]: string }[] = [];
  poolIds.map((p: string, i: number) => {
    const normalizedTokens = poolTokens[i].tokens.map((t: string) =>
      t.toLowerCase(),
    );
    const target: string = p.substring(0, 42);
    if (normalizedTokens.includes(target)) calls.push({ target });
  });

  const actualSupplies: Result[] = (
    await multiCall({
      calls,
      abi: supplyAbi,
      chain,
      block,
      permitFailure: true,
    })
  ).output;

  tokenInfos.supplies.map((t: Result, i: number) => {
    if (
      !calls
        .map((c: { [target: string]: string }) => c.target)
        .includes(t.input.target)
    )
      return;
    const supplyUpdate: Result | undefined = actualSupplies.find(
      (supplyUpdate: Result) => supplyUpdate.input.target == t.input.target,
    );
    if (supplyUpdate != null) tokenInfos.supplies[i] = supplyUpdate;
  });

  return getTokenValues(poolValues, tokenInfos);
}
export default async function getTokenPrices(
  chain: string,
  timestamp: number,
): Promise<Write[]> {
  let writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const poolIds: string[] = await getPoolIds(chain, timestamp);
  const gaugePools = await getGauges(chain);
  const tokenValues: TokenValues[] = (
    await getLpPrices(poolIds, chain, timestamp, block)
  ).filter((t: TokenValues) => t.price != Infinity);
  const gauges: string[] = tokenValues.map(item => {
    const gaugePool = gaugePools.find(info => info.address.toLowerCase() === item.address);
    if (gaugePool && gaugePool.gauges) {
      return gaugePool.gauges[0].id
    }
    return "";
  })

  tokenValues.map((v: TokenValues, i: number) => {
    addToDBWritesList(
      writes,
      chain,
      v.address,
      v.price,
      v.decimals,
      v.symbol,
      timestamp,
      "phux-lp",
      0.9,
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
      "phux-gauge",
      0.9,
      `asset#${chain}:${v.address}`,
    );
  });

  return writes;
}
