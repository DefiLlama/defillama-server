import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import { estimateBlockTimestamp } from "../../utils/block";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  tokenAbiName: string,
  timestamp: number | undefined = undefined,
): Promise<AdapterResult[]> {
  const block = (await getBlock(chain, timestamp)).number;
  let tokenAbi = abi.token;
  tokenAbi.name = tokenAbiName;
  const [amount, steps, startBlock, blockLength, receiver, token] =
    await Promise.all([
      call({ target, abi: abi.amount, chain, block }),
      call({ target, abi: abi.steps, chain, block }),
      call({ target, abi: abi.start, chain, block }),
      call({ target, abi: abi.stepLength, chain, block }),
      call({ target, abi: abi.receiver, chain, block }),
      call({ target, abi: abi.token, chain, block }),
    ]);

  // assume 1 block / 12s
  const start = await estimateBlockTimestamp(startBlock, chain);
  const length = blockLength * 12;
  const end = Number(start) + Number(length * steps);

  return [{ type: "step", start, end, amount, steps, receiver, token }];
}
