import { ChainApi } from "@defillama/sdk";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import abi from "./abi.json";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import { getTokenInfo } from "../../utils/erc20";

export default async function getWrappedPrices(
  timestamp: number,
  chain: string,
  assets: string[],
): Promise<Write[]> {
  const writes: Write[] = [];

  const api: ChainApi = await getApi(
    chain,
    timestamp ? timestamp : getCurrentUnixTimestamp(),
  );

  const [underlyings, balances, underlyingDecimals, info] = await Promise.all([
    api.multiCall({
      abi: abi.underlyingToken,
      calls: assets.map((target: string) => ({ target })),
      chain,
    }),
    api.multiCall({
      abi: abi.underlyingTokenBalance,
      calls: assets.map((target: string) => ({ target })),
      chain,
    }),
    api.multiCall({
      abi: abi.underlyingTokenDecimals,
      calls: assets.map((target: string) => ({ target })),
      chain,
    }),
    getTokenInfo(chain, assets, api.block ? Number(api.block) : undefined, {
      withSupply: true,
    }),
  ]);

  const poolTokenData = await getTokenAndRedirectDataMap(
    underlyings,
    chain,
    timestamp,
  );

  assets.map((token: string, i: number) => {
    const underlying = poolTokenData[underlyings[i].toLowerCase()];
    if (!underlying) return;

    const price =
      (balances[i] / info.supplies[i].output) *
      underlying.price *
      10 ** (info.decimals[i].output - underlyingDecimals[i]);

    addToDBWritesList(
      writes,
      chain,
      token,
      price,
      info.decimals[i].output,
      info.symbols[i].output,
      timestamp,
      "wombat wrapped",
      (underlying.confidence ?? 0.85) - 0.05,
    );
  });

  return writes;
}
