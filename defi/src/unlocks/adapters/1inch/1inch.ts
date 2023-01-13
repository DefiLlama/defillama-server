import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  timestamp: number | undefined = undefined,
): Promise<AdapterResult[]> {
  const block = (await getBlock(chain, timestamp)).number;
  const [
    cliffAmount,
    amount,
    steps,
    cliffDuration,
    duration,
    started,
    receiver,
    token,
  ] = await Promise.all([
    call({ target, abi: abi.cliffAmount, chain, block }),
    call({ target, abi: abi.stepAmount, chain, block }),
    call({ target, abi: abi.steps, chain, block }),
    call({ target, abi: abi.cliffDuration, chain, block }),
    call({ target, abi: abi.stepDuration, chain, block }),
    call({ target, abi: abi.start, chain, block }),
    call({ target, abi: abi.receiver, chain, block }),
    call({ target, abi: abi.token, chain, block }),
  ]);

  const start = Number(started) + Number(cliffDuration);

  return [
    { type: "step", start, duration, amount, steps, receiver, token },
    {
      type: "cliff",
      start,
      amount: cliffAmount,
      receiver,
      token,
    },
  ];
}
