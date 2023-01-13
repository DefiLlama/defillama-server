import { call } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
): Promise<AdapterResult[]> {
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
    call({ target, abi: abi.cliffAmount, chain }),
    call({ target, abi: abi.stepAmount, chain }),
    call({ target, abi: abi.steps, chain }),
    call({ target, abi: abi.cliffDuration, chain }),
    call({ target, abi: abi.stepDuration, chain }),
    call({ target, abi: abi.start, chain }),
    call({ target, abi: abi.receiver, chain }),
    call({ target, abi: abi.token, chain }),
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
