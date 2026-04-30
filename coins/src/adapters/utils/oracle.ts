import { getCurrentUnixTimestamp } from "../../utils/date";

export const DEFAULT_MAX_ORACLE_AGE_SECONDS = 27 * 60 * 60;

type FreshnessOpts = {
  timestamp: number;
  maxAgeSeconds?: number;
  label?: string;
  throwIfStale?: boolean;
};

export function checkOracleFresh(
  updatedAt: number | bigint | string,
  {
    timestamp,
    maxAgeSeconds = DEFAULT_MAX_ORACLE_AGE_SECONDS,
    label = "oracle",
    throwIfStale = true,
  }: FreshnessOpts,
): boolean {
  const now = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const updated = Number(updatedAt);
  const fresh = !!updated && updated >= now - maxAgeSeconds;
  if (!fresh && throwIfStale) {
    throw new Error(
      `${label} price is stale (updatedAt=${updated}, now=${now}, maxAge=${maxAgeSeconds}s)`,
    );
  }
  return fresh;
}
