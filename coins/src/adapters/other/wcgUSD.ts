import { getTokenAndRedirectData } from "../utils/database";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const chain = "base";

const wcgUSDToken = {
  address: "0x5ae84075f0e34946821a8015dab5299a00992721",
  symbol: "wcgUSD",
  decimals: 6,
};

const target = "0xCa72827a3D211CfD8F6b00Ac98824872b72CAb49";

export function wcgUSD(timestamp: number = 0) {
  return getTokenPrice(timestamp);
}

async function getTokenPrice(timestamp: number) {
  const api = await getApi(chain, timestamp);

  const [totalSupply, totalShares, [{ price: priceOfcgUSD }]] =
    await Promise.all([
      api.call({ abi: "erc20:totalSupply", target }),
      api.call({ abi: "uint256:getTotalShares", target }),
      getTokenAndRedirectData([target], "base", timestamp),
    ]);

  const ratio = totalSupply / totalShares;

  const price = ratio * priceOfcgUSD;

  const pricesObject: { [key: string]: any } = {};
  pricesObject[wcgUSDToken.address] = {
    token: wcgUSDToken.address,
    price,
    symbol: wcgUSDToken.symbol,
    decimals: wcgUSDToken.decimals,
  };

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "cygnus",
  });
}
