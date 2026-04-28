import { z } from 'zod';

// ============================================================================
// RWA Item Schema (from /current endpoint)
// ============================================================================

// defiActiveTvl is nested: { chain: { protocol: number } }
const defiActiveTvlSchema = z.record(
  z.string(),
  z.record(z.string(), z.number().finite().nonnegative())
);

export const rwaItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  assetName: z.string().nullable(),
  ticker: z.string().optional(),
  category: z.array(z.string()).optional(),
  chain: z.array(z.string()).optional(),
  primaryChain: z.string().optional(),
  onChainMcap: z.record(z.string(), z.number().finite()).optional(),
  activeMcap: z.record(z.string(), z.number().finite()).optional(),
  defiActiveTvl: defiActiveTvlSchema.optional(),
}).passthrough();

export const rwaCurrentResponseSchema = z.array(rwaItemSchema);

// ============================================================================
// RWA List Schema (from /list endpoint)
// Returns an object with canonicalMarketIds, platforms, chains, categories, assetGroups, idMap
// ============================================================================

export const rwaListResponseSchema = z.object({
  canonicalMarketIds: z.array(z.string()),
  platforms: z.array(z.string()),
  chains: z.array(z.string()),
  categories: z.array(z.string()),
  assetGroups: z.array(z.string()),
  idMap: z.record(z.string(), z.union([z.string(), z.number()])),
}).passthrough();

// ============================================================================
// RWA Stats Schema (from /stats endpoint)
// ============================================================================

export const rwaStatsSchema = z.object({}).passthrough();

// ============================================================================
// RWA ID Map Schema (from /id-map endpoint)
// ============================================================================

export const rwaIdMapSchema = z.record(z.string(), z.union([z.string(), z.number()]));

// ============================================================================
// RWA Chart Schema (from /chart/* endpoints)
// ============================================================================

export const rwaChartPointSchema = z.object({
  timestamp: z.number(),
}).passthrough();

export const rwaChartResponseSchema = z.array(rwaChartPointSchema);

// ============================================================================
// RWA Breakdown Chart Schema (from /chart/*-breakdown endpoints)
// ============================================================================

export const rwaBreakdownChartPointSchema = z.object({
  timestamp: z.number().optional(),
  date: z.number().optional(),
}).passthrough();

export const rwaBreakdownChartResponseSchema = z.array(rwaBreakdownChartPointSchema);

// ============================================================================
// RWA Category/Chain Filter Response
// ============================================================================

export const rwaFilterResponseSchema = z.object({
  data: z.array(rwaItemSchema),
}).passthrough();

// ============================================================================
// RWA Flows Schema (from /flows/:id endpoint)
// Net flow = (supply_t - supply_start) * price_t per chain
// ============================================================================

export const rwaFlowsResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  start: z.number(),
  end: z.number(),
  data: z.array(z.object({ timestamp: z.number() }).passthrough()),
}).passthrough();
