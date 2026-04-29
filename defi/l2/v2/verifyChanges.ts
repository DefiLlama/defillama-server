import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getCurrentUnixTimestamp } from "../../src/utils/date";
import { FinalData } from "../types";

// Threshold below which a drop to zero is treated as dust, not a regression.
const ZERO_REGRESSION_FLOOR_USD = 100_000;

function sqlConn() {
  const auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (auth.length !== 3) throw new Error("COINS2_AUTH must have 3 values");
  return postgres(auth[0], { idle_timeout: 30 });
}

export async function verifyChangesV2(chains: FinalData): Promise<void> {
  const sql = sqlConn();
  let rows: any[];
  try {
    rows = await queryPostgresWithRetry(
      sql`select timestamp, value from chainassets2 order by timestamp desc limit 1`,
      sql,
    );
  } finally {
    sql.end();
  }

  if (!rows.length) return; // first ever run — nothing to compare against
  const prev = JSON.parse(rows[0].value);
  const prevTs = Number(rows[0].timestamp);
  const hours = (getCurrentUnixTimestamp() - prevTs) / 3600;

  const issues: string[] = [];

  for (const chain of Object.keys(chains)) {
    const allNew = chains[chain];
    const allOld = prev[chain];
    const totalNew = Number(allNew?.total?.total ?? 0);
    const totalOld = Number(allOld?.total?.total ?? 0);

    if (chain.toLowerCase() === "bsc") console.log(`BSC own tokens: ${allNew.ownTokens.total}`);
    if (chain.toLowerCase() === "solana" && totalNew < 1000) throw new Error(`Missing Solana TVL`);
    if (chain.toLowerCase() === "tron" && totalNew < 15_000_000_000) throw new Error(`USDT not counted for Tron`);

    // Regression from real TVL to zero, regardless of staleness.
    if (totalOld > ZERO_REGRESSION_FLOOR_USD && totalNew === 0) {
      issues.push(`${chain}: total collapsed from ${totalOld.toFixed(0)} to 0`);
      continue;
    }

    if (!allOld || totalOld === 0) continue;

    // Drift check only meaningful when previous snapshot is recent.
    if (hours >= 6) continue;

    const forwardChange = (100 * Math.abs(totalNew - totalOld)) / totalOld;
    const backwardChange = totalNew !== 0 ? (100 * Math.abs(totalNew - totalOld)) / totalNew : 0;
    if (forwardChange < 100 && backwardChange < 100) continue;

    issues.push(
      `${chain} has had a ${totalNew > totalOld ? "increase" : "decrease"} of ${forwardChange.toFixed(0)}% in ${hours.toFixed(1)}h`,
    );
  }

  if (issues.length) throw new Error(`verifyChangesV2:\n  ${issues.join("\n  ")}`);
}
