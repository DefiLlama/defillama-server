import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { calculate4626Prices, Result4626 } from "../../utils/erc4626";
import { fetch } from "../../utils";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { transforms }: { transforms: { type: string; dependent: string }[] } = await fetch(
    `https://api.mean.finance/v1/transforms/networks/${chain}/transforms`,
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
  const writes: Write[] = [];
  if (tokens.length > 0) {
    const prices = await calculate4626Prices(chain, timestamp, tokens);
    const validPrices = prices.filter((priceData): priceData is Result4626 => !!priceData)
    for (const { token, price, decimals, symbol } of validPrices) {
      addToDBWritesList(
        writes,
        chain,
        token,
        price,
        decimals,
        symbol,
        timestamp,
        adapter,
        1,
      );
    }
  }
  return writes;
}
