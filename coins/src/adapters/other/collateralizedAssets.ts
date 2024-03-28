import { multiCall } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { MultiCallResults } from "../utils/sdkInterfaces";
import { getTokenInfo } from "../utils/erc20";
import { Write, CoinData, DbTokenInfos } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

type Asset = {
  token: string;
  vault: string;
  collateral: string;
};

export default async function getTokenPrices(
  chain: any,
  timestamp: number,
  assets: Asset[],
): Promise<Write[]> {
  let collateralBalances: MultiCallResults;
  let tokenInfos: DbTokenInfos;
  let underlyingPrices: CoinData[];
  const writes: Write[] = [];

  const block: number | undefined = await getBlock(chain, timestamp);

  [collateralBalances, tokenInfos, underlyingPrices] = await Promise.all([
    multiCall({
      chain,
      calls: assets.map((a: Asset) => ({
        target: a.collateral,
        params: a.vault,
      })),
      block,
      abi: "erc20:balanceOf",
    }),
    getTokenInfo(
      chain,
      assets.map((a: Asset) => a.token),
      block,
      { withSupply: true },
    ),
    getTokenAndRedirectData(
      assets.map((a: Asset) => a.collateral),
      chain,
      timestamp,
    ),
  ]);

  assets.map((a: Asset, i: number) => {
    const underlying: CoinData | undefined = underlyingPrices.find(
      (c: CoinData) => c.address == a.collateral.toLowerCase(),
    );
    if (!underlying) return;

    const price =
      (underlying.price *
        collateralBalances.output[i].output *
        10 ** tokenInfos.decimals[i].output) /
      (tokenInfos.supplies[i].output * 10 ** underlying.decimals);

    addToDBWritesList(
      writes,
      chain,
      a.token,
      price,
      tokenInfos.decimals[i].output,
      tokenInfos.symbols[i].output,
      timestamp,
      "collateralized",
      underlying.confidence ?? 0.6,
    );
  });

  return writes;
}
