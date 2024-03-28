import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Write } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";

export default async function getTokenPrices(
  timestamp: number,
  pool: string,
  knownToken: string,
  chain: any,
) {
  const writes: Write[] = [];

  try {
    const block: number | undefined = await getBlock(chain, timestamp);

    const [knownBalance, knownDecimals, knownInfo, lpInfo] = await Promise.all([
      call({
        target: knownToken,
        params: pool,
        abi: "erc20:balanceOf",
        block,
        chain,
      }),
      call({
        target: knownToken,
        abi: "erc20:decimals",
        block,
        chain,
      }),
      getTokenAndRedirectData([knownToken], chain, timestamp),
      getTokenInfo(chain, [pool], block, { withSupply: true }),
    ]);

    if (knownInfo.length == 0) return [];

    const price =
      ((knownBalance.output / 10 ** knownDecimals.output) *
        knownInfo[0].price *
        2) /
      (lpInfo.supplies[0].output / 10 ** lpInfo.decimals[0].output);

    addToDBWritesList(
      writes,
      chain,
      pool,
      price,
      lpInfo.decimals[0].output,
      lpInfo.symbols[0].output,
      timestamp,
      "extra uni v2",
      0.51,
    );
  } catch {}
  return writes;
}
