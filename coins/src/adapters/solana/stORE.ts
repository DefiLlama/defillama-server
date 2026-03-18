import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./utils";
import getWrites from "../utils/getWrites";

const state = "9Hd7Lwk9gjYRMb5PdYArWrq5JNeEj6P4b3X2ef4CaMcG";
const mint = "sTorERYB6xAZ1SSbwpK3zoK2EEwbBrc7TZAzg1uCGiH";

export async function stORE(timestamp: number = 0) {
  if (timestamp != 0) throw new Error(`stORE must only run at timestamp = 0`);

  const connection = getConnection();
  const stateInfo = await connection.getAccountInfo(new PublicKey(state));
  const tokenInfo = await connection.getAccountInfo(new PublicKey(mint));

  if (!tokenInfo || !stateInfo) throw new Error(`stORE adapter failed`);
  const supply = Number(tokenInfo.data.readBigUInt64LE(36));
  const tokensDeposited = Number(stateInfo.data.readBigUInt64LE(40));

  return getWrites({
    chain: "solana",
    timestamp,
    pricesObject: {
      [mint]: {
        underlying: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
        symbol: "stORE",
        decimals: 11,
        price: tokensDeposited / supply,
      },
    },
    projectName: "stORE",
  });
}