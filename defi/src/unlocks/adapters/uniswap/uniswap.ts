import { call } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  tokenSymbol: string,
): Promise<AdapterResult[]> {
  let tokenAbi = abi.token;
  tokenAbi.name = tokenSymbol;
  const [amount, cliff, start, end, receiver, token] = await Promise.all([
    call({ target, abi: abi.vestingAmount, chain }),
    call({ target, abi: abi.vestingCliff, chain }),
    call({ target, abi: abi.vestingBegin, chain }),
    call({ target, abi: abi.vestingEnd, chain }),
    call({ target, abi: abi.recipient, chain }),
    call({ target, abi: abi.token, chain }),
  ]);

  return [{ type: "linear", start, end, cliff, amount, receiver, token }];
}
