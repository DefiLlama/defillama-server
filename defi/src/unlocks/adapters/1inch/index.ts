import { call } from "@defillama/sdk/build/abi";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import abi from "./abi";

async function main(
  target: string,
  chain: any,
  timestamp: number | undefined = undefined,
) {
  const block = (await getBlock(chain, timestamp)).number;
  const [
    { output: cliffAmount },
    { output: amount },
    { output: steps },
    { output: cliffDuration },
    { output: stepDuration },
    { output: start },
  ] = await Promise.all([
    call({ target, abi: abi.cliffAmount, chain, block }),
    call({ target, abi: abi.stepAmount, chain, block }),
    call({ target, abi: abi.steps, chain, block }),
    call({ target, abi: abi.cliffDuration, chain, block }),
    call({ target, abi: abi.stepDuration, chain, block }),
    call({ target, abi: abi.start, chain, block }),
  ]);

  const end =
    Number(start) + Number(cliffDuration) + Number(stepDuration * steps);
  return { type: "step", start, end, amount, steps };
}

main("0x1C30Bc98984Af21B4b8ea6CC1109E2FAc3987905", "ethereum");
// ts-node adapters/1inch/index.ts
