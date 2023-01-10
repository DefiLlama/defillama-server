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
    { output: amount },
    { output: cliff },
    { output: start },
    { output: end },
  ] = await Promise.all([
    call({ target, abi: abi.vestingAmount, block, chain }),
    call({ target, abi: abi.vestingCliff, block, chain }),
    call({ target, abi: abi.vestingBegin, block, chain }),
    call({ target, abi: abi.vestingEnd, block, chain }),
  ]);

  return { type: "linear", start, end, cliff, amount };
}

main("0x4750c43867EF5F89869132ecCF19B9b6C4286E1a", "ethereum"); // uniswap
main("0x3cc634320A3825448539176Cc6a1627FaC451BBb", "ethereum"); // euler
// ts-node adapters/uniswap/index.ts
