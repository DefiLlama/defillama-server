import postgres from "postgres";
// import { FetchResultFees, SimpleAdapter } from "../adapters/types";
// import { CHAIN } from "../helpers/chains";
import { getCurrentUnixTimestamp } from "../src/utils/date";
// import { getPrices } from "../utils/prices";

// WIP
export default async function main(params: { timestamp?: number; searchWidth?: number } = {}) {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  //   const todaysTimestamp = getTimestampAtStartOfDayUTC(timestamp);
  const sql = postgres(process.env.INDEXA_DB!);

  const now = new Date(timestamp * 1e3);
  const hourAgo = new Date(now.getTime() - 1000 * 60 * 60);
  try {
    const transfer_txs = await sql`
      SELECT 
        address, deployer_address
      FROM
        ethereum.tokens
      WHERE
        created_block_time BETWEEN ${hourAgo.toISOString()} AND ${now.toISOString()};
    `;
    return;
  } catch (e) {
    console.error(e);
  }
}
main(); // ts-node defi/l2/minted.ts
