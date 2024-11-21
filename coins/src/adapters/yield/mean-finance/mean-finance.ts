import { calculate4626Prices } from "../../utils/erc4626";
import { fetch } from "../../utils";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { transforms }: { transforms: { type: string; dependent: string }[] } = await fetch(
    `https://api.balmy.xyz/v1/transforms/networks/${chain}/transforms`,
  );
  const tokens4626 = transforms
    .filter((t) => t.type === "ERC4626")
    .map(({ dependent }) => dependent);
  return await unwrap4626(chain, tokens4626, timestamp, "mean-finance");
}

export async function unwrap4626(
  chain: string,
  tokens: string[],
  timestamp: number,
  adapter: string,
) {
  return calculate4626Prices(chain, timestamp, tokens, adapter)
}
