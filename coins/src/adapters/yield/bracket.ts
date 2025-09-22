import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const chain = "ethereum";

const wrapped = [
  "0x91094D333e018f81874D62E27522479BEC131b5f",
  "0x7309E1E2e74af170c69bdE8FCB30397f8697D5FF",
  "0x3EBFa39649EFb8aa0B4e8dCCCd25884D8223c1ee",
];

export async function bracket(timestamp: number = 0) {
  const api = await getApi(chain, timestamp);

  const vaults = await api.multiCall({
    abi: "address:bracketVault",
    calls: wrapped,
  });

  const assets = await api.multiCall({
    abi: "address:token",
    calls: vaults,
  });

  const balances = await api.multiCall({
    abi: "function convertToAssets(uint256 assets) external view returns (uint256)",
    calls: vaults.map((target) => ({ target, params: 1e12 })),
  });

  const pricesObject: any = {};
  vaults.forEach((vault, i) => {
    pricesObject[vault] = {
      underlying: assets[i],
      price: balances[i] / 1e12,
    };
    pricesObject[wrapped[i]] = {
      underlying: assets[i],
      price: balances[i] / 1e12,
    };
  });

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "bracket",
  });
}
