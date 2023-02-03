import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { getTimestamp } from "@defillama/sdk/build/util";
import { AdapterResult } from "../../types/adapters";
import { estimateBlockTimestamp } from "../../utils/block";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  excludedPoolIndexes: number[] = [],
): Promise<AdapterResult[]> {
  const [startBlock, endBlock, rewardPerBlock, totalAllocPoint, token] =
    await Promise.all([
      call({ target, abi: abi.startBlock, chain }),
      call({
        target,
        abi: abi.endBlock[target as keyof typeof abi.endBlock],
        chain,
      }),
      call({
        target,
        abi: abi.rewardPerBlock[target as keyof typeof abi.rewardPerBlock],
        chain,
      }),
      call({ target, abi: abi.totalAllocPoint, chain }),
      call({ target, abi: abi.token[target as keyof typeof abi.token], chain }),
    ]);

  const [excludedPoolRewards, start, end, decimals] = await Promise.all([
    multiCall({
      calls: excludedPoolIndexes.map((p: number) => ({ params: p, target })),
      abi: abi.poolInfo[target as keyof typeof abi.poolInfo],
      chain,
    }).then((r: any[]) => r.reduce((p: number, c: any) => p + c.allocPoint, 0)),
    getTimestamp(Number(startBlock), chain),
    estimateBlockTimestamp(endBlock, chain),
    call({ target: token, abi: "erc20:decimals", chain }),
  ]);

  const actualEmissionFactor = excludedPoolRewards / totalAllocPoint;
  const blocks = endBlock - startBlock;
  const amount =
    rewardPerBlock * blocks * actualEmissionFactor * 10 ** -decimals;

  return [
    {
      type: "linear",
      start,
      end,
      amount,
      token,
    },
  ];
}
