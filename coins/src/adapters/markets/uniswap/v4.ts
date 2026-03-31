import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";
import { getTokenAndRedirectDataMap } from "../../utils/database";
import { log } from "@defillama/sdk";

const projectName = "uniV4";
const NATIVE = "0x0000000000000000000000000000000000000000";

const stateViewAbis = {
  getSlot0:
    "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  getLiquidity:
    "function getLiquidity(bytes32 poolId) view returns (uint128)",
};

const stateViews: Record<string, string> = {
  base: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71",
};

const config: Record<string, Array<{ poolId: string; token: string; paired: string }>> = {
  base: [
    {
      poolId: "0xd7e5522c9cc3682c960afada6adde0f8116580f2ad2cef08c197faf625e53842", // ETH/BEAN
      token: "0x5c72992b83E74c4D5200A8E8920fB946214a5A5D", // BEAN
      paired: NATIVE,
    },
  ],
};

const MAX_PRICE_IMPACT = 0.02; // 2%
const SELL_AMOUNT_USD = 1000;

export function uniV4(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrices(chain, timestamp)),
  );
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const entries = config[chain];
  const stateView = stateViews[chain];
  const pricesObject: any = {};

  // Fetch slot0 and liquidity for all pools
  const slot0s = await api.multiCall({
    abi: stateViewAbis.getSlot0,
    target: stateView,
    calls: entries.map((e) => ({ params: [e.poolId] })),
  });
  const liquidities = await api.multiCall({
    abi: stateViewAbis.getLiquidity,
    target: stateView,
    calls: entries.map((e) => ({ params: [e.poolId] })),
  });

  const allTokens = entries.flatMap((e) => [e.token, e.paired]);
  const erc20Tokens = allTokens.filter((t) => t !== NATIVE);
  const decimalsMap: Record<string, number> = { [NATIVE]: 18 };
  const decimalsResults = await api.multiCall({
    abi: "erc20:decimals",
    calls: erc20Tokens,
  });
  erc20Tokens.forEach((t, i) => { decimalsMap[t.toLowerCase()] = decimalsResults[i]; });

  // Get paired token USD prices for impact check
  const pairedTokens = [...new Set(entries.map((e) => e.paired.toLowerCase()))];
  const pairedPrices = await getTokenAndRedirectDataMap(pairedTokens, chain, timestamp);

  entries.forEach((entry, i) => {
    const { token, paired } = entry;
    const { tick } = slot0s[i];
    const liquidity = Number(liquidities[i]);
    const tokenLower = token.toLowerCase();
    const pairedLower = paired.toLowerCase();

    // currency0 < currency1 by address
    const tokenIsCurrency0 = tokenLower < pairedLower;
    const dec0 = tokenIsCurrency0 ? decimalsMap[tokenLower] : decimalsMap[pairedLower];
    const dec1 = tokenIsCurrency0 ? decimalsMap[pairedLower] : decimalsMap[tokenLower];

    // Use tick for price (avoids precision loss with sqrtPriceX96)
    let price = Math.pow(1.0001, tick) * 10 ** (dec0 - dec1);
    if (!tokenIsCurrency0) price = 1 / price;

    // skip if $1K sell moves price > 2%
    const pairedData = pairedPrices[pairedLower];
    if (pairedData?.price) {
      const sqrtPrice = Math.pow(1.0001, tick / 2);
      const pairedReserveHuman = tokenIsCurrency0
        ? (liquidity * sqrtPrice) / 10 ** dec1   // paired is currency1
        : liquidity / (sqrtPrice * 10 ** dec0);  // paired is currency0
      const pairedReserveUsd = pairedReserveHuman * pairedData.price;
      const impact = SELL_AMOUNT_USD / pairedReserveUsd;
      if (impact > MAX_PRICE_IMPACT) {
        log(
          `uniV4: skipping ${token} on ${chain} - est. price impact ${(impact * 100).toFixed(1)}% exceeds ${MAX_PRICE_IMPACT * 100}% (paired reserve $${pairedReserveUsd.toFixed(0)})`,
        );
        return;
      }
    }

    pricesObject[token] = { underlying: paired, price };
  });

  return getWrites({ chain, timestamp, pricesObject, projectName });
}
