import { Write } from "../utils/dbInterfaces";
import { call } from "@defillama/sdk/build/abi";
import { addToDBWritesList } from "../utils/database";

const UNISWAP_V3_POOL_ABI = {
  inputs: [],
  name: "slot0",
  outputs: [
    { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
    { internalType: "int24", name: "tick", type: "int24" },
    { internalType: "uint16", name: "observationIndex", type: "uint16" },
    { internalType: "uint16", name: "observationCardinality", type: "uint16" },
    {
      internalType: "uint16",
      name: "observationCardinalityNext",
      type: "uint16",
    },
    { internalType: "uint8", name: "feeProtocol", type: "uint8" },
    { internalType: "bool", name: "unlocked", type: "bool" },
  ],
  stateMutability: "view",
  type: "function",
};

const UNISWAP_POOL_ADDRESS = "0x21a28c2eb4ab5c5e752ee147c0242c7ed8168253";

async function getTokenPriceFromPool() {
  // Call the Uniswap V3 pool contract to get the slot0 data
  const slot0Data = (
    await call({
      target: UNISWAP_POOL_ADDRESS,
      abi: UNISWAP_V3_POOL_ABI,
      chain: "arbitrum",
    })
  ).output;

  // Extract sqrtPriceX96
  const sqrtPriceX96 = slot0Data.sqrtPriceX96;

  // Calculate price: (sqrtPriceX96^2) / 2^192
  const price = Number(sqrtPriceX96) ** 2 / 2 ** 192;

  return price;
}

async function getTokenPrice(timestamp: number) {
  const writes: Write[] = [];

  // Fetch price from Uniswap pool
  const price = await getTokenPriceFromPool();

  // Add price data to database writes
  addToDBWritesList(
    writes,
    "arbitrum", // Chain name
    "0xd946188A614A0d9d0685a60F541bba1e8CC421ae", // ZAR token address
    price, // Price of the token
    18, // Decimals
    "ZAR", // Symbol
    timestamp, // Timestamp (optional for now)
    "zarban", // Adapter name
    0.9, // Confidence score
  );

  return writes;
}

// Export the adapter
export async function zarban(timestamp: number = 0) {
  return await getTokenPrice(timestamp);
}
