import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import { periodToSeconds } from "../../utils/time";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  totalQty: number,
): Promise<AdapterResult[]> {
  const nextStream = await call({
    abi: abi.getNextStreamId,
    chain,
    target,
  });
  const streamIds = [];
  for (var i = 100_000; i < nextStream; i++) {
    streamIds.push(i);
  }
  const streams = await multiCall({
    abi: abi.getStream,
    chain,
    calls: streamIds.map((params: number) => ({ target, params })),
  });

  let cliff = 0;
  const results: AdapterResult[] = streams.map((s: any) => {
    const amount = ((s.stopTime - s.startTime) * s.ratePerSecond) / 10 ** 18;
    cliff = amount;
    return {
      type: "linear",
      start: s.startTime,
      end: s.stopTime,
      amount,
      cliff,
      receiver: s.recipient,
      token: s.tokenAddress,
    };
  });

  const amount = results.reduce(
    (p: number, c: AdapterResult) => Number(p) - Number(c.amount),
    totalQty,
  );

  results.push({
    type: "cliff",
    start: results[results.length - 1].end,
    amount,
    receiver: results[results.length - 1].receiver,
    token: results[results.length - 1].token,
    confirmed: false,
  });

  return results;
}
