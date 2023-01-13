import { call } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import { estimateBlockTimestamp } from "../../utils/block";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  tokenAbiName: string,
): Promise<AdapterResult[]> {
  let tokenAbi = abi.token;
  tokenAbi.name = tokenAbiName;
  const [amount, steps, startBlock, blockLength, receiver, token] =
    await Promise.all([
      call({ target, abi: abi.amount, chain }),
      call({ target, abi: abi.steps, chain }),
      call({ target, abi: abi.start, chain }),
      call({ target, abi: abi.stepLength, chain }),
      call({ target, abi: abi.receiver, chain }),
      call({ target, abi: abi.token, chain }),
    ]);

  // assume 1 block / 12s
  const start = await estimateBlockTimestamp(startBlock, chain);
  const length = blockLength * 12;
  const end = Number(start) + Number(length * steps);

  return [{ type: "step", start, end, amount, steps, receiver, token }];
}
