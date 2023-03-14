import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { calculate4626Prices } from "../../utils/erc4626";
import { fetch } from "../../utils";

const blacklist: string[] = [
  // Ethereum
  '0xCd0E5871c97C663D43c62B5049C123Bb45BfE2cC', // Euler 4626 (USDC)
  '0xd4dE9D2Fc1607d1DF63E1c95ecBfa8d7946f5457', // Euler 4626 (WETH)
  '0xc4113b7605D691E073c162809060b6C5Ae402F1e', // Euler 4626 (DAI)
  '0x48E345cb84895EAb4db4C44ff9B619cA0bE671d9', // Euler 4626 (WBTC)
  '0xb95E6eee428902C234855990E18a632fA34407dc', // Euler 4626 (LUSD)
  '0x7C6D161b367Ec0605260628c37B8dd778446256b', // Euler 4626 (wstETH)
].map(token => token.toLowerCase());

export default async function getTokenPrices(chain: string, timestamp: number) {
  const tokens: { type: string; address: string }[] = await fetch(
    `https://api.mean.finance/v1/dca/networks/${chain}/tokens?includeNotAllowed`,
  );
  const tokens4626 = tokens
    .filter(
      (t) =>
        t.type === "YIELD_BEARING_SHARE" &&
        !blacklist.includes(t.address.toLowerCase()),
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
    for (const { token, price, decimals, symbol } of prices) {
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
