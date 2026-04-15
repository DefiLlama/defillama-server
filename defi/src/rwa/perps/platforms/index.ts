import type { PlatformAdapter } from "./types";
export type { PlatformAdapter, ParsedPerpsMarket, FundingEntry } from "./types";

import { hyperliquidAdapter } from "./hyperliquid";
import { gtradeAdapter } from "./gtrade";
import { ostiumAdapter } from "./ostium";
import { avantisAdapter } from "./avantis";
import { helixAdapter } from "./helix";
import { extendedAdapter } from "./extended";

/** All implemented adapters — used by preview tooling and tests. */
const ALL_ADAPTERS: PlatformAdapter[] = [
  hyperliquidAdapter,
  gtradeAdapter,
  ostiumAdapter,
  avantisAdapter,
  helixAdapter,
  extendedAdapter,
];

/** Adapters that are live in the pipeline / cron / API. */
const PUBLISHED_ADAPTERS: PlatformAdapter[] = [
  hyperliquidAdapter,
  ostiumAdapter,
];

const ADAPTER_MAP = new Map<string, PlatformAdapter>(
  ALL_ADAPTERS.map((a) => [a.name, a]),
);

/** Returns only the adapters published to production. */
export function getAllAdapters(): PlatformAdapter[] {
  return PUBLISHED_ADAPTERS;
}

/** Returns every implemented adapter, including unpublished ones (for preview/testing). */
export function getAllAdaptersIncludingUnpublished(): PlatformAdapter[] {
  return ALL_ADAPTERS;
}

export function getAdapter(name: string): PlatformAdapter | undefined {
  return ADAPTER_MAP.get(name);
}
