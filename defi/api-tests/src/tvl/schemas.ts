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

const chainTvlDetailSchema = z.object({
  tvl: z.array(historicalDataPointSchema),
  tokensInUsd: z.array(z.object({
    date: z.number(),
    tokens: z.record(z.string(), z.number()),
  })).nullable().optional(),
  tokens: z.array(z.object({
    date: z.number(),
    tokens: z.record(z.string(), z.number()),
  })).nullable().optional(),
});

export const protocolDetailsSchema = protocolSchema.extend({
  // Override tvl and chainTvls for details endpoint
  tvl: z.array(historicalDataPointSchema).nullable(),
  chainTvls: z.record(z.string(), chainTvlDetailSchema),
  currentChainTvls: chainTvlSchema.optional(),
  
  // slug is not returned in protocol details endpoint
  slug: z.string().optional(),
  
  // Additional fields in details
  otherProtocols: z.array(z.string()).optional(),
  tokensInUsd: z.array(z.object({
    date: z.number(),
    tokens: z.record(z.string(), z.number()),
  })).optional(),
  tokens: z.array(z.object({
    date: z.number(),
    tokens: z.record(z.string(), z.number()),
  })).optional(),
  raises: z.array(z.object({
    date: z.union([z.string(), z.number()]).optional(),
    round: z.string().optional(),
    amount: z.number().optional(),
    valuation: z.number().nullable().optional(),
    otherInvestors: z.array(z.string()).optional(),
  })).optional(),
  isParentProtocol: z.boolean().optional(),
  metrics: z.record(z.string(), z.boolean()).optional(),
  tokenPrice: z.number().nullable().optional(),
  tokenMcap: z.number().nullable().optional(),
  tokenSupply: z.number().nullable().optional(),
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
// Historical Chain TVL Schema
// ============================================================================

export const historicalChainTvlPointSchema = z.object({
  date: z.number(),
  tvl: z.number().finite().nonnegative(),
});

export const historicalChainTvlArraySchema = z.array(historicalChainTvlPointSchema);

// ============================================================================
// Chain Schema
// ============================================================================

export const chainSchema = z.object({
  gecko_id: z.string().nullable(),
  tvl: z.number(),
  tokenSymbol: z.string().nullable(),
  cmcId: z.string().nullable(),
  name: z.string(),
  chainId: z.union([
    z.number(),
    z.string().transform(Number),
    z.null()
  ]).optional(),
});

// ============================================================================
// Protocol TVL Schema (from /tvl/{protocol} endpoint)
// ============================================================================

export const protocolTvlSchema = z.number().finite().nonnegative();

// ============================================================================
// Chains V2 Schema (from /v2/chains endpoint)
// ============================================================================

export const chainsV2ArraySchema = z.array(chainSchema);

// ============================================================================
// Chain Assets Schema (from /chainAssets endpoint)
// ============================================================================

const chainAssetSectionSchema = z.object({
  total: z.string(),
  breakdown: z.record(z.string(), z.string()),
});

const chainAssetDataSchema = z.record(z.string(), chainAssetSectionSchema);

export const chainAssetsSchema = z.object({
  timestamp: z.number(),
}).catchall(chainAssetDataSchema);

// ============================================================================
// Token Protocols Schema (from /tokenProtocols/{symbol} endpoint)
// ============================================================================

export const tokenProtocolSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  amountUsd: z.record(z.string(), z.number().finite()), // Can be negative (debt protocols)
  misrepresentedTokens: z.boolean(),
});

export const tokenProtocolsArraySchema = z.array(tokenProtocolSchema);

// ============================================================================
// Inflows Schema (from /inflows/{protocol}/{timestamp} endpoint)
// ============================================================================

export const tokenTvlDataSchema = z.object({
  date: z.string(),
  tvl: z.record(z.string(), z.number().finite().nonnegative()),
});

export const inflowsSchema = z.object({
  outflows: z.number().finite(),
  oldTokens: tokenTvlDataSchema,
  currentTokens: tokenTvlDataSchema,
});

// ============================================================================
// Array Schemas
// ============================================================================

export const protocolsArraySchema = z.array(protocolSchema);
export const chartDataArraySchema = z.array(chartDataPointSchema);

