// https://etherscan.io/tx/0x33e2a46ad1d759e46c083276aaccd4fc1ca0e53907e3492ebfa3d14e0a9f3f08#eventlog
// CreateStream (index_topic_1 uint256 streamId, index_topic_2 address sender, index_topic_3 address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)
// 0xcd18eaa163733da39c232722cbc4e8940b1d8888
// gives start, end, qty, token, recipient

import { AdapterResult } from "../../types/adapters";
import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
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
  timestamp: number | undefined,
): Promise<AdapterResult[]> {
  const block = await getBlock(chain, timestamp);
  const target: string = contracts[chain][version];

  const count: number = await call({
    target,
    chain,
    abi: abi.nextStreamId,
    block,
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
      block,
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
