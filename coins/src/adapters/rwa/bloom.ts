import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";
import abi from "./bloom-abi.json";

/**
 * Configuration for Bloom Org contracts.
 * Each Org contract manages fractionalized real-world assets and has an associated OrgToken.
 * The portfolioPricePerToken() function returns the price per token scaled by 100.
 */
const config: { [chain: string]: { org: string; symbol: string }[] } = {
  base: [
    // Add deployed Org contracts here
    { org: "0x74d9690e111a7577fdd2a2712f1aa3ff0d3ec79c", symbol: "BLO" }
  ],
};

/**
 * Bloom RWA Adapter
 * 
 * Fetches prices for Bloom OrgTokens from on-chain Org contracts.
 * Each Org contract holds fractionalized real-world assets (typically real estate)
 * and provides a portfolioPricePerToken() function that returns the NAV-based price.
 * 
 * Price calculation in Org.sol:
 *   portfolioPricePerToken = (totalAssetValue + baseCurrencyBalance) * 100 / totalSupply
 * 
 * The price is scaled by 100, so we divide by 100 to get the actual USD price.
 */
export async function bloom(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];

  for (const [chain, orgs] of Object.entries(config)) {
    if (orgs.length === 0) continue;

    const api = await getApi(chain, timestamp);

    // Batch fetch all prices and token addresses
    const [prices, tokenAddresses] = await Promise.all([
      api.multiCall({
        abi: abi.portfolioPricePerToken,
        calls: orgs.map((o) => o.org),
      }),
      api.multiCall({
        abi: abi.getToken,
        calls: orgs.map((o) => o.org),
      }),
    ]);

    for (let i = 0; i < orgs.length; i++) {
      const { symbol } = orgs[i];
      const rawPrice = prices[i];
      const tokenAddress = tokenAddresses[i];

      // Skip if we couldn't get valid data
      if (!rawPrice || !tokenAddress) {
        console.warn(`Skipping ${symbol}: missing price or token address`);
        continue;
      }

      // portfolioPricePerToken returns price * 100
      // e.g., 150 means $1.50 per token
      const price = Number(rawPrice) / 100;

      // Skip invalid prices
      if (price <= 0 || !isFinite(price)) {
        console.warn(`Skipping ${symbol}: invalid price ${price}`);
        continue;
      }

      addToDBWritesList(
        writes,
        chain,
        tokenAddress.toLowerCase(),
        price,
        18, // OrgToken decimals
        symbol,
        timestamp,
        "bloom-rwa",
        0.8, // Confidence: on-chain price from asset valuations
      );
    }
  }
  return writes;
}
