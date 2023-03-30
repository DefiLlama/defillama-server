import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { calculate4626Prices, Result4626 } from "../../utils/erc4626";
import { fetch } from "../../utils";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens: { type: string; address: string }[] = await fetch(
    `https://api.mean.finance/v1/dca/networks/${chain}/tokens?includeNotAllowed`,
  );
  const tokens4626 = tokens
    .filter(
      (t) => t.type === "YIELD_BEARING_SHARE"
    )
    .map(({ address }) => address);
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
