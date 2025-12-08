// Zod schemas for Stablecoins API endpoints
// These define the runtime validation and TypeScript types

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const stablecoinChainDataSchema = z.record(z.string(), z.number().finite().nonnegative());

// ============================================================================
// Stablecoin Schema (from /stablecoins/stablecoins endpoint)
// ============================================================================

export const stablecoinSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  address: z.string().optional(),
  gecko_id: z.string().nullable().optional(),
  cmcId: z.string().nullable().optional(),
  chains: z.array(z.string()),
  marketCap: z.number().finite().nonnegative().nullable().optional(),
  circulating: z.record(z.string(), z.number().finite().nonnegative()).optional(),
  // circulatingPrevDay/Week/Month can be either a record or a number (API inconsistency)
  circulatingPrevDay: z.union([
    z.record(z.string(), z.number().finite().nonnegative()),
    z.number().finite().nonnegative()
  ]).optional(),
  circulatingPrevWeek: z.union([
    z.record(z.string(), z.number().finite().nonnegative()),
    z.number().finite().nonnegative()
  ]).optional(),
  circulatingPrevMonth: z.union([
    z.record(z.string(), z.number().finite().nonnegative()),
    z.number().finite().nonnegative()
  ]).optional(),
  // price can be either a number or a string (API inconsistency)
  price: z.union([
    z.number().finite().nonnegative(),
    z.string()
  ]).nullable().optional(),
  pegType: z.string().optional(),
  pegMechanism: z.string().optional(),
  url: z.string().optional(),
  twitter: z.string().optional(),
  audit_links: z.array(z.string()).optional(),
  auditLinks: z.array(z.string()).optional(),
  description: z.string().nullable().optional(),
  priceSource: z.string().nullable().optional(),
  onCoinGecko: z.string().nullable().optional(),
});

export const stablecoinsArraySchema = z.array(stablecoinSchema);

// Wrapper schema for the list endpoint response
export const stablecoinsListResponseSchema = z.object({
  peggedAssets: z.array(stablecoinSchema),
});

// ============================================================================
// Stablecoin Asset Schema (from /stablecoins/stablecoin/{asset} endpoint)
// ============================================================================

// Chain balance structure for single asset endpoint
const chainBalanceSchema = z.object({
  tokens: z.union([
    z.array(z.any()),
    z.record(z.string(), z.any())
  ]).optional(),
  total: z.number().optional(),
}).passthrough(); // Allow additional fields

export const stablecoinAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  address: z.string().optional(),
  gecko_id: z.string().nullable().optional(),
  cmcId: z.string().nullable().optional(),
  pegType: z.string().optional(),
  pegMechanism: z.string().optional(),
  price: z.union([
    z.number().finite().nonnegative(),
    z.string()
  ]).nullable().optional(),
  priceSource: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  url: z.string().optional(),
  twitter: z.string().optional(),
  wiki: z.string().optional(),
  audit_links: z.array(z.string()).optional(),
  auditLinks: z.array(z.string()).optional(),
  onCoinGecko: z.string().nullable().optional(),
  mintRedeemDescription: z.string().optional(),
  // Asset endpoint specific fields (not chains array!)
  chainBalances: z.record(z.string(), chainBalanceSchema).optional(),
  currentChainBalances: z.record(z.string(), chainBalanceSchema).optional(),
  tokens: z.array(z.any()).optional(), // Array of token objects
  historicalChainData: z.record(z.string(), z.array(z.object({
    date: z.number(),
    circulating: z.number().finite().nonnegative(),
  }))).optional(),
  marketCap: z.number().finite().nonnegative().nullable().optional(),
  circulating: z.record(z.string(), z.number().finite().nonnegative()).optional(),
});

// ============================================================================
// Stablecoin Chains Schema (from /stablecoins/stablecoinchains endpoint)
// ============================================================================

export const stablecoinChainSchema = z.object({
  name: z.string(),
  tvl: z.number().finite().nonnegative().optional(), // Some chains don't have TVL
  tokens: z.number().int().nonnegative().optional(), // Some chains don't have token count
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
  change_30d: z.number().nullable().optional(),
  gecko_id: z.string().nullable().optional(),
  tokenSymbol: z.string().nullable().optional(),
  totalCirculatingUSD: z.record(z.string(), z.number().finite().nonnegative()).optional(),
});

export const stablecoinChainsArraySchema = z.array(stablecoinChainSchema);

// ============================================================================
// Stablecoin Prices Schema (from /stablecoins/stablecoinprices endpoint)
// ============================================================================

export const stablecoinPriceSchema = z.object({
  date: z.number(),
  // Prices can be numbers or strings (for some coins like frankencoin)
  prices: z.record(z.string(), z.union([z.number().finite().nonnegative(), z.string()])),
});

export const stablecoinPricesArraySchema = z.array(stablecoinPriceSchema);

// ============================================================================
// Stablecoin Charts Schema (from /stablecoins/stablecoincharts endpoints)
// ============================================================================

export const stablecoinChartPointSchema = z.object({
  date: z.union([z.number(), z.string().transform(Number)]), // API returns string timestamp
  totalCirculating: z.record(z.string(), z.number().finite().nonnegative()), // API returns object like { "peggedUSD": 123 }
  totalCirculatingUSD: z.record(z.string(), z.number().finite().nonnegative()).optional(),
  totalMintedUSD: z.record(z.string(), z.number().finite().nonnegative()).optional(),
  circulating: z.record(z.string(), z.number().finite().nonnegative()).optional(),
});

export const stablecoinChartsArraySchema = z.array(stablecoinChartPointSchema);

// ============================================================================
// Stablecoin Dominance Schema (from /stablecoins/stablecoindominance/{chain} endpoint)
// ============================================================================

export const stablecoinDominanceSchema = z.object({
  date: z.union([z.number(), z.string().transform(Number)]), // API returns string timestamp
  totalCirculatingUSD: z.record(z.string(), z.number().finite().nonnegative()), // API returns object like { "peggedUSD": 123 }
  greatestMcap: z.object({
    gecko_id: z.string().nullable().optional(),
    symbol: z.string(),
    mcap: z.number().finite().nonnegative(),
  }).optional()
});

export const stablecoinDominanceArraySchema = z.array(stablecoinDominanceSchema);

