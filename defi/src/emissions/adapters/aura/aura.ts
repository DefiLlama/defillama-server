import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  amount: number,
): Promise<AdapterResult[]> {
  const start = await call({
    abi: abi.startTime,
    chain,
    target,
  });
  const end = await call({
    abi: abi.endTime,
    chain,
    target,
  });
  const token = await call({
    abi: abi.rewardToken,
    chain,
    target,
  });
  return [
    {
      type: "linear",
      start,
      end,
      amount,
      cliff: 0,
      token,
    },
  ];
}
