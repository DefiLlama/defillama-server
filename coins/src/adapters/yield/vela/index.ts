import allContracts from "./contracts.json";
import abi from "./abi.json";
import { ChainApi } from "@defillama/sdk";
import { getApi } from "../../utils/sdk";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";

export function vela(timestamp: number = 0) {
  return Promise.all(
    Object.keys(allContracts).map((c) => getTokenPrices(c, timestamp)),
  );
}

async function getTokenPrices(
  chain: string,
  timestamp: number,
): Promise<Write[]> {
  const writes: Write[] = [];
  const api: ChainApi = await getApi(chain, timestamp);
  const contracts = allContracts[chain as keyof typeof allContracts];

  const [aum, lpInfo] = await Promise.all([
    api.call({
      target: contracts.vault,
      abi: abi.totalUsd,
    }),
    getTokenInfo(chain, [contracts.VLP], undefined, {
      withSupply: true,
      timestamp,
    }),
  ]);

  addToDBWritesList(
    writes,
    chain,
    contracts.VLP,
    aum / (lpInfo.supplies[0].output * 10 ** 12),
    lpInfo.decimals[0].output,
    lpInfo.symbols[0].output,
    timestamp,
    "vela",
    1,
  );

  return writes;
}
