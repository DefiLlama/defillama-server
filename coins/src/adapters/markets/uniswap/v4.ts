import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";

const projectName = "uniV4";
const NATIVE = "0x0000000000000000000000000000000000000000";

const stateViewAbi =
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)";

const stateViews: Record<string, string> = {
  base: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71",
};

const config: Record<string, Array<{ poolId: string; token: string; paired: string }>> = {
  base: [
    {
      poolId: "0xd7e5522c9cc3682c960afada6adde0f8116580f2ad2cef08c197faf625e53842",
      token: "0x5c72992b83E74c4D5200A8E8920fB946214a5A5D", // BEAN
      paired: NATIVE,
    },
  ],
};

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

  const slot0s = await api.multiCall({
    abi: stateViewAbi,
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

  entries.forEach((entry, i) => {
    const { token, paired } = entry;
    const { sqrtPriceX96 } = slot0s[i];
    const tokenLower = token.toLowerCase();
    const pairedLower = paired.toLowerCase();

    // currency0 < currency1 by address
    const tokenIsCurrency0 = tokenLower < pairedLower;
    const dec0 = tokenIsCurrency0 ? decimalsMap[tokenLower] : decimalsMap[pairedLower];
    const dec1 = tokenIsCurrency0 ? decimalsMap[pairedLower] : decimalsMap[tokenLower];

    // sqrtPriceX96 = sqrt(price) * 2^96, where price = currency1 / currency0
    // price(currency0 in currency1) = (sqrtPriceX96 / 2^96)^2 * 10^(dec0 - dec1)
    const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
    let price = sqrtPrice * sqrtPrice * 10 ** (dec0 - dec1);
    if (!tokenIsCurrency0) price = 1 / price;

    pricesObject[token] = { underlying: paired, price };
  });

  return getWrites({ chain, timestamp, pricesObject, projectName });
}