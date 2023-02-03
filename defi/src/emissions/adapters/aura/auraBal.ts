import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  amount: number,
): Promise<AdapterResult[]> {
  const [start, duration, token] = await Promise.all([
    call({
      abi: abi.startTime,
      chain,
      target,
    }),
    call({
      abi: abi.duration,
      chain,
      target,
    }),
    call({
      abi: abi.rewardToken,
      chain,
      target,
    }),
  ]);

  return [
    {
      type: "linear",
      start,
      end: Number(start) + Number(duration),
      amount,
      cliff: 0,
      token,
    },
  ];
}
