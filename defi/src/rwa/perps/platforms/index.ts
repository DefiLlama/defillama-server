import type { PlatformAdapter } from "./types";
export type { PlatformAdapter, ParsedPerpsMarket, FundingEntry } from "./types";

import { hyperliquidAdapter } from "./hyperliquid";
import { gtradeAdapter } from "./gtrade";
import { ostiumAdapter } from "./ostium";
import { avantisAdapter } from "./avantis";
import { helixAdapter } from "./helix";
import { extendedAdapter } from "./extended";

const ALL_ADAPTERS: PlatformAdapter[] = [
  hyperliquidAdapter,
  gtradeAdapter,
  ostiumAdapter,
  avantisAdapter,
  helixAdapter,
  extendedAdapter,
];

const ADAPTER_MAP = new Map<string, PlatformAdapter>(
  ALL_ADAPTERS.map((a) => [a.name, a]),
);

export function getAllAdapters(): PlatformAdapter[] {
  return ALL_ADAPTERS;
}

export function getAdapter(name: string): PlatformAdapter | undefined {
  return ADAPTER_MAP.get(name);
}
