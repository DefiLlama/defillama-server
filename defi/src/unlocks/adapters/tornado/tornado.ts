import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import { periodToSeconds } from "../../utils/time";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  eventTimestamps: { [event: string]: number },
): Promise<AdapterResult[]> {
  const eventBlocks = (
    await Promise.all(
      Object.values(eventTimestamps).map((t: number) => getBlock(chain, t)),
    )
  ).map((r: any) => ("block" in r ? r.block : r.number));

  const secondsPerMonth = periodToSeconds.day * 30;
  const [cliffDuration, steps, start, receiver, token] = await Promise.all([
    call({ target, abi: abi.cliffInMonths, chain }),
    call({ target, abi: abi.durationInMonths, chain }),
    call({ target, abi: abi.startTimestamp, chain }),
    call({ target, abi: abi.beneficiary, chain }),
    call({ target, abi: abi.token, chain }),
  ]);
  const //[beforeCliffQty, afterCliffQty,
    [beforeStepQty, afterStepQty] = await Promise.all([
      // call({ target, abi: abi.vestedAmount, chain, block: eventBlocks[0] }),
      // call({ target, abi: abi.vestedAmount, chain, block: eventBlocks[1] }),
      call({ target, abi: abi.vestedAmount, chain, block: eventBlocks[2] }),
      call({ target, abi: abi.vestedAmount, chain, block: eventBlocks[3] }),
    ]);

  return [
    {
      type: "step",
      start,
      duration: steps * secondsPerMonth,
      amount: afterStepQty - beforeStepQty,
      steps,
      receiver,
      token,
    },
    // {
    //   type: "cliff",
    //   start: start + secondsPerMonth * cliffDuration,
    //   amount: afterCliffQty - beforeCliffQty,
    //   receiver,
    //   token,
    // },
  ];
}
