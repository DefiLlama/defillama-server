import { AdapterResult } from "../../types/adapters";
import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import abi from "./abi";

type Stream = {
  sender: string;
  recipient: string;
  deposit: number;
  tokenAddress: string;
  startTime: number;
  stopTime: number;
  ratePerSecond: number;
};
const contracts: { [chain: string]: { [contract: string]: string } } = {
  ethereum: {
    v1: "0xA4fc358455Febe425536fd1878bE67FfDBDEC59a",
    v1p1: "0xCD18eAa163733Da39c232722cBC4E8940b1D8888",
  },
};
export async function main(
  chain: any,
  version: string,
): Promise<AdapterResult[]> {
  const target: string = contracts[chain][version];

  const count: number = await call({
    target,
    chain,
    abi: abi.nextStreamId,
  });
  const streamIds: number[] = Array.from(Array(Number(count)).keys());

  const streams: Stream[] = (
    await multiCall({
      target,
      chain,
      abi: abi.getStream,
      calls: streamIds.map((params: number) => ({
        target,
        params,
      })),
      requery: false,
    })
  ).filter((s: Stream) => s != null);

  return streams.map((s: Stream) => ({
    type: "linear",
    start: s.startTime,
    end: s.stopTime,
    amount: (s.stopTime - s.startTime) * s.ratePerSecond,
    receiver: s.recipient,
    token: s.tokenAddress,
  }));
}
