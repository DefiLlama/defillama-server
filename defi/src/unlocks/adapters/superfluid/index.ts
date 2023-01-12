import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

const host: string = "0x4E583d9390082B65Bef884b629DFA426114CED6d";

export default async function main(
  target: string,
  chain: any,
  timestamp: number | undefined = undefined,
): Promise<AdapterResult[]> {
  const block = (await getBlock(chain, timestamp)).number;
  const [cliffAmount] = await Promise.all([
    call({ target, abi: abi.cliffAmount, chain, block }),
  ]);

  return [{ type: "step", start, duration, amount, steps, reciever, token }];
}
