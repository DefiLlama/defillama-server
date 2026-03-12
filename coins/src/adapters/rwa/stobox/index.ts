import { Write } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

const config = {
  arbitrum: {
    oracle: '0x7C48bb52E63fe34C78F0D14Ee6E59BDe95D93645',
    factory: '0x096D75d0501c3B1479FFe15569192CeC998223b4',
  },
};

/**
 * Fetches token prices from Stobox oracle for a specific chain.
 * Token list is retrieved dynamically from StoboxRWAVaultFactory contract.
 * @param chain - The blockchain network name
 * @param timestamp - Unix timestamp for price query (0 for current)
 * @returns Array of Write objects containing token prices
 */
async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const { oracle, factory } = config[chain as keyof typeof config];

  // Fetch token list from factory contract
  const tokens: string[] = await api.call({
    abi: 'function generalTokenList() external view returns (address[] memory)',
    target: factory,
  });

  if (!tokens || tokens.length === 0) {
    return [];
  }

  const tokenInfo = await api.multiCall({
    abi: 'function getCoinPrice(uint256, address, address) external view returns (bool, uint256)',
    target: oracle,
    calls: tokens.map((token: string) => ({ params: [840, token, '0x0000000000000000000000000000000000000000'] })),
  });

  const pricesObject: any = {};
  const writes: Write[] = [];
  tokens.forEach((contract: string, idx: number) => {
    pricesObject[contract] = { price: tokenInfo[idx][1] / 1e18 };
  });

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "stobox" });
  return writes;
}

/**
 * Main adapter function for Stobox RWA tokens.
 * Fetches prices for all configured chains (Arbitrum).
 * @param timestamp - Unix timestamp for price query (0 for current)
 * @returns Promise resolving to array of Write objects for all chains
 */
export function stobox(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map((chain) => getTokenPrices(chain, timestamp)));
}
