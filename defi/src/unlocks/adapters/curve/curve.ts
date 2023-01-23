import { call } from "@defillama/sdk/build/abi/abi2";
import { AdapterResult } from "../../types/adapters";
import abi from "./abi";

export default async function main(
  target: string,
  chain: any,
  cliff: number,
): Promise<AdapterResult> {
  const [start, end, token, rawAmount] = await Promise.all([
    call({ abi: abi.start_time, chain, target }),
    call({ abi: abi.end_time, chain, target }),
    call({ abi: abi.token, chain, target }),
    call({
      abi: abi.initial_locked_supply,
      chain,
      target,
    }),
  ]);

  const decimals = await call({ abi: "erc20:decimals", chain, target: token });

  return {
    type: "linear",
    start,
    end,
    amount: rawAmount / 10 ** decimals,
    cliff,
    token,
  };
}
