import { call } from "@defillama/sdk/build/abi";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { estimateBlockTimestamp } from "../../utils/block";
import abi from "./abi";

async function main(
  target: string,
  chain: any,
  timestamp: number | undefined = undefined,
) {
  const block = (await getBlock(chain, timestamp)).number;
  const [
    { output: amount },
    { output: steps },
    { output: startBlock },
    { output: blockLength },
  ] = await Promise.all([
    call({ target, abi: abi.amount, chain, block }),
    call({ target, abi: abi.steps, chain, block }),
    call({ target, abi: abi.start, chain, block }),
    call({ target, abi: abi.stepLength, chain, block }),
  ]);

  // assume 1 block / 12s
  const start = await estimateBlockTimestamp(startBlock, chain);
  const length = blockLength * 12;
  const end = Number(start) + Number(length * steps);

  return { type: "step", start, end, amount, steps };
}
main("0x332580e0DA5b5072FF5d5b73A494A65Bb99744D8", "ethereum");
// ts-node adapters/looksrare/index.ts
