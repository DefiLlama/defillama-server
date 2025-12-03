/**
 * PikuDAO USP - Yield bearing stablecoin backed by USDC
 * USP accrues yield over time, with its value increasing relative to USDC
 * Price is fetched from the rate contract's getPriceForIssuance() function
 * Returns value in 6 decimals (e.g., 1037001 = $1.037001)
 */

import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const rateContract = "0x433471901bA1A8BDE764E8421790C7D9bAB33552";

const chain = "ethereum";
const token = "0x098697ba3fee4ea76294c5d6a466a4e3b3e95fe6";
const decimals = 18;
const symbol = "USP";

export async function usp(timestamp = 0) {
  const api = await getApi(chain, timestamp);

  const rate = await api.call({
    target: rateContract,
    abi: "function getPriceForIssuance() view returns (uint256)",
  });

  const price = rate / 1e6;

  // You can always mint USP from primary markets, so we can assume it has a high confidence
  const confidence = 0.99;

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    decimals,
    symbol,
    timestamp,
    "usp",
    confidence,
  );

  return writes;
}
