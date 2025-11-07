// Zod schemas for TVL API endpoints
// These define the runtime validation and TypeScript types
// Source reference: defi/src/protocols/types.ts

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const chainTvlSchema = z.record(z.string(), z.number().finite());

export const tokenTvlSchema = z.record(z.string(), z.number());

// ============================================================================
// Protocol Schema (from /protocols endpoint)
// ============================================================================

export const protocolSchema = z.object({
  // Required fields
  id: z.string().min(1),
  name: z.string().min(1),
  symbol: z.string(),
  chains: z.array(z.string()),
  slug: z.string().min(1),
  chainTvls: chainTvlSchema,
  tvl: z.number().finite().nullable(),
  
  // Optional fields
  address: z.string().nullable().optional(),
  url: z.string().optional(),
  description: z.string().nullable().optional(),
  chain: z.string().optional(),
  logo: z.string().nullable().optional(),
  audits: z.string().nullable().optional(),
  audit_note: z.string().nullable().optional(),
  gecko_id: z.string().nullable().optional(),
  cmcId: z.string().nullable().optional(),
  mcap: z.number().finite().nullable().optional(),
  category: z.string().optional(),
  module: z.string().optional(),
  twitter: z.string().nullable().optional(),
  listedAt: z.number().optional(),
  forkedFrom: z.array(z.string()).optional(),
  oracles: z.array(z.string()).optional(),
  audit_links: z.array(z.string()).optional(),
  change_1h: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
  tokenBreakdowns: z.record(z.string(), tokenTvlSchema).optional(),
  parentProtocolSlug: z.string().optional(),
  staking: z.number().optional(),
  pool2: z.number().optional(),
  openSource: z.boolean().optional(),
  wrongLiquidity: z.boolean().optional(),
  misrepresentedTokens: z.boolean().optional(),
  rugged: z.boolean().optional(),
  dimensions: z.record(z.string(), z.any()).optional(),
  methodology: z.string().optional(),
  governanceID: z.array(z.string()).optional(),
  github: z.array(z.string()).optional(),
  oraclesBreakdown: z.array(z.object({
    name: z.string(),
    type: z.string(),
    proof: z.array(z.string()).optional(),
    chains: z.array(z.object({
      chain: z.string(),
    })).optional(),
  })).optional(),
  // Hallmarks can have various formats in the actual data
  hallmarks: z.array(z.union([
    z.tuple([z.number(), z.string()]),
    z.array(z.any())
  ])).optional(),
});

// ============================================================================
// Protocol Details Schema (from /protocol/:slug endpoint)
// ============================================================================

export const historicalDataPointSchema = z.object({
  date: z.number(),
  totalLiquidityUSD: z.number().finite().nonnegative(),
});

export const protocolDetailsSchema = protocolSchema.extend({
  // Override tvl and chainTvls for details endpoint
  tvl: z.union([z.array(historicalDataPointSchema), z.number()]).optional(),
  chainTvls: z.record(z.string(), z.any()).optional(),
  currentChainTvls: chainTvlSchema.optional(),
  
  // Additional fields in details
  otherProtocols: z.array(z.string()).optional(),
  tokensInUsd: z.array(z.any()).optional(),
  tokens: z.array(z.any()).optional(),
  raises: z.array(z.object({
    date: z.string().optional(),
    round: z.string().optional(),
    amount: z.number().optional(),
  })).optional(),
});

// ============================================================================
// Chart Data Schemas
// ============================================================================

export const chartDataPointSchema = z.object({
  date: z.union([z.string(), z.number()]),
  totalLiquidityUSD: z.number().finite().nonnegative(),
});

export const historicalTvlPointSchema = z.object({
  date: z.number(),
  tvl: z.number(),
});

// ============================================================================
// Chain Schema
// ============================================================================

export const chainSchema = z.object({
  gecko_id: z.string().nullable(),
  tvl: z.number(),
  tokenSymbol: z.string().nullable(),
  cmcId: z.string().nullable(),
  name: z.string(),
  chainId: z.number().optional(),
});

// ============================================================================
// Array Schemas
// ============================================================================

export const protocolsArraySchema = z.array(protocolSchema);
export const chartDataArraySchema = z.array(chartDataPointSchema);

