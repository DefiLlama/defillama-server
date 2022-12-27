const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Result } from "../../utils/sdkInterfaces";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";

async function getPoolInfos(block: number | undefined, chain: any) {
  const operator: string = (
    await call({
      target: "0x989aeb4d175e16225e39e87d0d97a3360524ad80",
      chain,
      block,
      abi: abi.operator
    })
  ).output;

  const poolLength: number = (
    await call({ target: operator, chain, block, abi: abi.poolLength })
  ).output;
  const poolIndexes: number[] = Array.from(Array(Number(poolLength)).keys());

  return (
    await multiCall({
      calls: poolIndexes.map((p: number) => ({ target: operator, params: p })),
      chain,
      block,
      abi: abi.poolInfo
    })
  ).output;
}
export default async function getTokenPrices(timestamp: number) {
  const chain: any = "ethereum";
  const block: number | undefined = await getBlock(chain, timestamp);
  const poolInfos: Result[] = await getPoolInfos(block, chain);

  let underlyingData: CoinData[];
  let tokenInfos: any;
  [underlyingData, tokenInfos] = await Promise.all([
    getTokenAndRedirectData(
      poolInfos.map((p: Result) => p.output.lptoken),
      chain,
      timestamp
    ),
    getTokenInfo(
      chain,
      poolInfos.map((p: Result) => p.output.token),
      block,
    )
  ]);

  const writes: Write[] = [];
  underlyingData.map((u: CoinData) => {
    const poolInfo: Result | undefined = poolInfos.find(
      (p: Result) => p.output.lptoken.toLowerCase() == u.address
    );
    if (poolInfo == null) return;
    const tokenInfoIndex = poolInfos.indexOf(poolInfo);

    addToDBWritesList(
      writes,
      chain,
      poolInfo.output.token,
      undefined,
      tokenInfos.decimals[tokenInfoIndex].output,
      tokenInfos.symbols[tokenInfoIndex].output,
      timestamp,
      "convex",
      u.confidence == undefined ? 0.7 : u.confidence,
      `asset#${chain}:${u.address}`
    );
  });

  return writes;
}
