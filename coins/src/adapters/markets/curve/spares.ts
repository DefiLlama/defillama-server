import { multiCall } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { getGasTokenBalance } from "../../utils/gasTokens";
import { Result, Multicall } from "../../utils/sdkInterfaces";
import { getTokenInfo, listUnknownTokens } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import {
  aggregateBalanceCalls,
  mapGaugeTokenBalances,
  getUnderlyingPrices,
  unknownTokens,
} from "./curve";

type Pool = {
  address: string;
  nCoins: string;
  token: string;
};

const abi = {
  coins: {
    stateMutability: "view",
    type: "function",
    name: "coins",
    inputs: [{ name: "arg0", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
};

async function poolBalances(chain: any, pool: any, block: number | undefined) {
  const coins = (
    await multiCall({
      calls: [...Array(Number(pool.nCoins)).keys()].map((n) => ({
        params: [n],
        target: pool.address,
      })),
      chain,
      abi: abi.coins,
      block,
    })
  ).output.map((c: Result) => c.output);

  let calls: Multicall[] = aggregateBalanceCalls(coins, [pool.nCoins], {
    output: pool.address,
  });
  calls = mapGaugeTokenBalances(calls, chain);
  let balances: Result[] = (
    await multiCall({
      calls,
      chain,
      abi: "erc20:balanceOf",
      block,
      permitFailure: true,
    })
  ).output;

  return await getGasTokenBalance(chain, pool.address, balances, block);
}

async function unknownPools(
  chain: any,
  block: number | undefined,
  timestamp: number,
  poolList: Pool[],
  writes: Write[],
  unknownPoolList: any[],
  unknownTokensList: any[],
) {
  for (let pool of poolList) {
    try {
      const token: string = pool.token;

      const [balances, tokenInfo] = await Promise.all([
        poolBalances(chain, pool, block),
        getTokenInfo(chain, [token], block, { withSupply: true }),
      ]);

      const poolTokens: any[] = await getUnderlyingPrices(
        balances,
        chain,
        timestamp,
        unknownTokensList,
      );
      if (poolTokens.includes(undefined) || poolTokens.length == 0) {
        unknownPoolList.push({
          address: [pool].map((i: any) => i.output)[0],
          token,
          balances,
          tokenInfo,
          poolTokens,
        });
        continue;
      }

      const isJunk = poolTokens.find(
        (t: any) =>
          t.price == null ||
          t.price <= 0 ||
          t.balance == null ||
          t.balance == 0,
      );
      if (isJunk != null) continue;

      const poolValue: number = poolTokens.reduce(
        (p, c) => p + c.balance * c.price,
        0,
      );
      if (poolValue < 400) continue;

      const price =
        (poolValue * 10 ** tokenInfo.decimals[0].output) /
        tokenInfo.supplies[0].output;
      if (
        isNaN(price) ||
        price == 0 ||
        price == Infinity ||
        tokenInfo.supplies[0].output == 0
      )
        continue;

      const confidence =
        poolTokens
          .map((p: any) => {
            if (p.confidence == undefined) return 1;
            return p.confidence;
          })
          .reduce((a, b) => a + b, 0) / poolTokens.length;

      addToDBWritesList(
        writes,
        chain,
        token,
        price,
        tokenInfo.decimals[0].output,
        tokenInfo.symbols[0].output,
        timestamp,
        "curve-LP",
        confidence,
      );
    } catch {
      // console.log([pool].map((i: any) => i.output)[0]);
    }
  }
}

export default async function getTokenPrices(
  chain: any,
  timestamp: number,
  poolList: Pool[],
) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  let unknownTokensList: string[] = [];
  let unknownPoolList: any[] = [];

  await unknownPools(
    chain,
    block,
    timestamp,
    poolList,
    writes,
    unknownPoolList,
    unknownTokensList,
  );
  await unknownTokens(chain, block, writes, timestamp, unknownPoolList);

  let problems: string[] = [];
  unknownTokensList = [...new Set(unknownTokensList)];
  unknownTokensList.map((t: string) => {
    const writeKeys = writes.map((w: Write) =>
      w.PK.substring(w.PK.indexOf(":") + 1),
    );
    if (!writeKeys.includes(t)) problems.push(t);
  });

  await listUnknownTokens(chain, problems, block);

  return writes;
}
