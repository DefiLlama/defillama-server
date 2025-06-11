import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./utils";
import getWrites from "../utils/getWrites";

const pool_state = "iFgP2EbzHUZzMjqbjaagJQ8zmn6as3Hw95aVUKm67od";
const pst_mint = "59obFNBzyTBGowrkif5uK7ojS58vsuWz3ZCvg6tfZAGw";

export async function pst(timestamp: number = 0) {
  if (timestamp != 0) throw new Error(`pst must only run at timestamp = 0`);

  const connection = getConnection();

  const stateInfo = await connection.getAccountInfo(new PublicKey(pool_state));
  const tokenInfo = await connection.getAccountInfo(new PublicKey(pst_mint));

  if (!tokenInfo || !stateInfo) throw new Error(`pst adapter failed`);
  const supply = Number(tokenInfo.data.readBigUInt64LE(36));
  const tokensDeposited = Number(stateInfo.data.readBigUInt64LE(30));

  return getWrites({
    chain: "solana",
    timestamp,
    pricesObject: {
      [pst_mint]: {
        underlying: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "PST",
        decimals: 6,
        price: tokensDeposited / supply,
      },
    },
    projectName: "PST",
  });
}
