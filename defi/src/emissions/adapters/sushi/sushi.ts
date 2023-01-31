import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";
// (total alloc point - alloc point pool 45) / total alloc point * sushi per block

export default async function main(
  target: string,
  chain: any,
  tokenSymbol: string,
  excludedPoolIndexes: number[] = [],
): Promise<AdapterResult[]> {
  let tokenAbi = abi.token;
  tokenAbi.name = tokenSymbol;

  const [startBlock, endBlock, rewardPerBlock, totalAllocPoint, token] =
    await Promise.all([
      call({ target, abi: abi.startBlock, chain }),
      call({ target, abi: abi.endBlock, chain }),
      call({ target, abi: abi.rewardPerBlock, chain }),
      call({ target, abi: abi.totalAllocPoint, chain }),
      call({ target, abi: tokenAbi, chain }),
    ]);
  const excludedPoolRewards = await multiCall({
    calls: excludedPoolIndexes.map((p: number) => ({ params: p, target })),
    abi: abi.poolInfo,
    chain,
  });
  //   const decimals = await call({ target: token, abi: "erc20:decimals", chain });
  return [
    // {
    //   type: "linear",
    //   start,
    //   end,
    //   cliff,
    //   amount: rawAmount / 10 ** decimals,
    //   receiver,
    //   token,
    // },
  ];
}
