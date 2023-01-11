import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  tokenSymbol: string,
  timestamp: number | undefined = undefined,
): Promise<AdapterResult[]> {
  const block = (await getBlock(chain, timestamp)).number;
  let tokenAbi = abi.token;
  tokenAbi.name = tokenSymbol;
  const [amount, cliff, start, end, reciever, token] = await Promise.all([
    call({ target, abi: abi.vestingAmount, block, chain }),
    call({ target, abi: abi.vestingCliff, block, chain }),
    call({ target, abi: abi.vestingBegin, block, chain }),
    call({ target, abi: abi.vestingEnd, block, chain }),
    call({ target, abi: abi.recipient, block, chain }),
    call({ target, abi: abi.token, block, chain }),
  ]);

  return [{ type: "linear", start, end, cliff, amount, reciever, token }];
}
