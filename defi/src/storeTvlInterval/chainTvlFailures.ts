// Per-(protocol, chain) TVL failure tracker.
//
// When a single chain in a multi-chain protocol fails, getAndStoreTvl substitutes
// the last cached value (subject to age + share thresholds in isCacheDataFresh).
// This module persists each failure event so the team can identify chains that
// keep breaking and either fix or remove them from the adapter (per issue #11354
// second sentence: "track these failures and fix/remove the problematic chain").
//
// Storage: Postgres table `chain_tvl_failures` (PRIMARY KEY (protocol_id, chain)).
// Reporting: daily summary to STALE_COINS_ADAPTERS_WEBHOOK; chains failing > 3 days
// are escalated to TEAM_WEBHOOK.

import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getPgConnection } from "../utils/shared/getDBConnection";
import { sendMessage } from "../utils/discord";
import { humanizeNumber } from "@defillama/sdk";

export type ChainTvlFailure = {
  protocol_id: string;
  chain: string;
  error_class: string;
  last_failure_at: number;        // unix seconds
  fallback_used: boolean;
  fallback_reason: string | null; // 'too-old' | 'over-threshold' | 'malformed-cache' | 'no-cache' | 'not-cron-task' | 'low-total-tvl' | null
  cached_tvl: number;
  total_tvl: number;
};

export const columns = [
  "protocol_id",
  "chain",
  "error_class",
  "last_failure_at",
  "fallback_used",
  "fallback_reason",
  "cached_tvl",
  "total_tvl",
];

const ESCALATE_AFTER_HOURS = 72;

export async function recordChainFailure(f: ChainTvlFailure): Promise<void> {
  try {
    const sql = await getPgConnection();
    await queryPostgresWithRetry(
      sql`
        insert into chain_tvl_failures ${(sql as any)([f], ...columns)}
        on conflict (protocol_id, chain) do update set
          error_class = excluded.error_class,
          last_failure_at = excluded.last_failure_at,
          fallback_used = excluded.fallback_used,
          fallback_reason = excluded.fallback_reason,
          consecutive_failures = chain_tvl_failures.consecutive_failures + 1,
          cached_tvl = excluded.cached_tvl,
          total_tvl = excluded.total_tvl;
      `,
      sql,
    );
  } catch (e) {
    // Never let failure-recording itself break the TVL pipeline.
    console.error(`recordChainFailure failed: ${e}`);
  }
}

export async function clearChainFailure(protocol_id: string, chain: string): Promise<void> {
  try {
    const sql = await getPgConnection();
    await queryPostgresWithRetry(
      sql`
        delete from chain_tvl_failures
        where protocol_id = ${protocol_id} and chain = ${chain}
      `,
      sql,
    );
  } catch (e) {
    console.error(`clearChainFailure failed: ${e}`);
  }
}

export async function notifyChainTvlFailures(): Promise<void> {
  try {
    const sql = await getPgConnection();
    const allColumns = [...columns, "consecutive_failures"];
    const stored: (ChainTvlFailure & { consecutive_failures: number })[] = await queryPostgresWithRetry(
      sql`select ${(sql as any)(allColumns)} from chain_tvl_failures order by last_failure_at asc`,
      sql,
    );
    if (!stored.length) return;

    const now = Date.now() / 1000;
    let summary = "";
    let escalation = "";
    for (const f of stored) {
      const ageHours = (now - f.last_failure_at) / 3600;
      const ageDays = ageHours / 24;
      const fallbackInfo = f.fallback_used
        ? `fallback used (${f.fallback_reason ?? "ok"})`
        : `fallback NOT used (${f.fallback_reason ?? "n/a"})`;
      const line = `\n- ${f.protocol_id}/${f.chain}: ${f.consecutive_failures} consecutive failures over ${ageDays.toFixed(1)}d. Last error: ${f.error_class}. ${fallbackInfo}. Cached TVL ${humanizeNumber(f.cached_tvl)} / total ${humanizeNumber(f.total_tvl)}.`;
      summary += line;
      if (ageHours > ESCALATE_AFTER_HOURS) escalation += line;
    }

    const promises: any[] = [];
    if (summary && process.env.STALE_COINS_ADAPTERS_WEBHOOK) {
      promises.push(
        sendMessage(
          `Open chain TVL failures (cleared automatically on next successful run):${summary}`,
          process.env.STALE_COINS_ADAPTERS_WEBHOOK,
          true,
        ),
      );
    }
    if (escalation && process.env.TEAM_WEBHOOK) {
      promises.push(
        sendMessage(
          `Chains failing > ${ESCALATE_AFTER_HOURS}h (consider removing from adapter):${escalation}`,
          process.env.TEAM_WEBHOOK,
          true,
        ),
      );
    }
    await Promise.all(promises);
  } catch (e) {
    console.error(`notifyChainTvlFailures failed: ${e}`);
  }
}

// Allow this module to be invoked as a standalone script, mirroring staleCoins.ts.
// Use: RUN_SCRIPT_MODE=true ts-node defi/src/storeTvlInterval/chainTvlFailures.ts
if (process.env.RUN_SCRIPT_MODE) {
  notifyChainTvlFailures()
    .catch(console.error)
    .then(() => {
      console.log("Done");
      process.exit(0);
    });
}
