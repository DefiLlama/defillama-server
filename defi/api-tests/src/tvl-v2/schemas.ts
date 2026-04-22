// Zod schemas for TVL V2 API endpoints
// The overview endpoint returns protocol metadata without heavy historical data
// (tvl, chainTvls, tokens, tokensInUsd are stripped from the response)

import { z } from 'zod';

// ============================================================================
// TVL V2 Metrics Protocol Overview Schema
// ============================================================================

const raiseSchema = z.object({
  date: z.union([z.string(), z.number()]).optional(),
  round: z.string().optional(),
  amount: z.number().nullable().optional(),
  valuation: z.number().nullable().optional(),
  otherInvestors: z.array(z.string()).optional(),
  name: z.string().optional(),
  chains: z.array(z.string()).optional(),
  sector: z.string().optional(),
  category: z.string().optional(),
  categoryGroup: z.string().optional(),
  source: z.string().optional(),
  leadInvestors: z.array(z.string()).optional(),
  defillamaId: z.string().optional(),
}).passthrough();

export const metricsProtocolSchema = z.object({
  // Required fields
  id: z.string().min(1),
  name: z.string().min(1),
  chains: z.array(z.string()),

  // Current TVL by chain
  currentChainTvls: z.record(z.string(), z.number().finite()).optional(),

  // Optional metadata
  symbol: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  url: z.string().optional(),
  description: z.string().nullable().optional(),
  chain: z.string().optional(),
  logo: z.string().nullable().optional(),
  audits: z.string().nullable().optional(),
  gecko_id: z.string().nullable().optional(),
  cmcId: z.string().nullable().optional(),
  category: z.string().optional(),
  slug: z.string().optional(),
  module: z.string().optional(),
  twitter: z.string().nullable().optional(),
  listedAt: z.number().optional(),
  forkedFrom: z.array(z.string()).optional(),
  oracles: z.array(z.string()).optional(),
  audit_links: z.array(z.string()).optional(),
  openSource: z.boolean().optional(),
  wrongLiquidity: z.boolean().optional(),
  misrepresentedTokens: z.boolean().optional(),
  rugged: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  deadUrl: z.boolean().optional(),

  // Financial data
  mcap: z.number().finite().nullable().optional(),
  tokenPrice: z.number().nullable().optional(),
  tokenMcap: z.number().nullable().optional(),
  tokenSupply: z.number().nullable().optional(),

  // Related protocols
  otherProtocols: z.array(z.string()).optional(),
  parentProtocol: z.string().optional(),
  parentProtocolSlug: z.string().optional(),
  isParentProtocol: z.boolean().optional(),

  // Raises / fundraising
  raises: z.array(raiseSchema).optional(),

  // Additional metadata
  methodology: z.string().optional(),
  tvlCodePath: z.string().optional(),
  treasuryCodePath: z.string().optional(),
  treasury: z.string().optional(),
  oraclesBreakdown: z.array(z.object({
    name: z.string(),
    type: z.string(),
    proof: z.array(z.any()),
  }).passthrough()).optional(),
  dimensions: z.record(z.string(), z.any()).optional(),
  hallmarks: z.array(z.union([
    z.tuple([z.number(), z.string()]),
    z.array(z.any()),
  ])).optional(),
  metrics: z.record(z.string(), z.boolean()).optional(),
  governanceID: z.array(z.string()).optional(),
  github: z.array(z.string()).optional(),
  warningBanners: z.any().optional(),
}).passthrough();

// ============================================================================
// TVL V2 Chart Schema (from /v2/chart/tvl/protocol/:name endpoint)
// Returns array of [timestamp, tvlValue] tuples
// ============================================================================

export const chartDataPointSchema = z.tuple([z.number(), z.number()]);

export const chartArraySchema = z.array(chartDataPointSchema);

// ============================================================================
// TVL V2 Chart Breakdown Schemas
// chain-breakdown: [timestamp, { chainName: tvlValue }]
// token-breakdown: [timestamp, { tokenSymbol: amount }]
// ============================================================================

export const chartBreakdownPointSchema = z.tuple([z.number(), z.record(z.string(), z.number())]);

export const chartBreakdownArraySchema = z.array(chartBreakdownPointSchema);
