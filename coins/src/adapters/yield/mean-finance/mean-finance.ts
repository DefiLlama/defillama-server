import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { calculate4626Prices } from "../../utils/erc4626";
import { fetch } from "../../utils"

export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];
  const tokens: { type: string, address: string }[] = await fetch(`https://api.mean.finance/v1/dca/networks/${chain}/tokens`)

  const tokens4626 = tokens
    .filter(({ type }) => type === 'YIELD_BEARING_SHARE')
    .map(({ address }) => address)
  if (tokens4626.length > 0) {
    const prices = await calculate4626Prices(chain, timestamp, tokens4626)
    for (const { token, price, decimals, symbol } of prices) {
      addToDBWritesList(
        writes,
        chain,
        token,
        price,
        decimals,
        symbol,
        timestamp,
        "mean-finance",
        1
      );
    };
  }
  return writes;
}
