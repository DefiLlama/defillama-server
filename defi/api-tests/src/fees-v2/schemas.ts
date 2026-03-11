// Zod schemas for Fees V2 API endpoints
// Uses the dimension-based /v2/metrics/fees and /v2/chart/fees routes

import { z } from 'zod';

// ============================================================================
// Fees V2 Metrics Protocol Overview Schema
// ============================================================================

export const metricsProtocolSchema = z.object({
  // Required fields
  name: z.string().min(1),
  defillamaId: z.string().min(1),
  chains: z.array(z.string()),

  // Identity / metadata
  id: z.string().optional(),
  displayName: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  chain: z.string().optional(),
  logo: z.string().nullable().optional(),
  audits: z.string().nullable().optional(),
  gecko_id: z.string().nullable().optional(),
  cmcId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  module: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  listedAt: z.number().optional(),
  audit_links: z.array(z.string()).optional(),
  forkedFrom: z.array(z.string()).nullable().optional(),
  github: z.array(z.string()).nullable().optional(),
  governanceID: z.array(z.string()).nullable().optional(),
  treasury: z.string().nullable().optional(),
  protocolType: z.string().nullable().optional(),
  methodologyURL: z.string().nullable().optional(),
  methodology: z.union([z.string(), z.record(z.string(), z.string())]).nullable().optional(),
  misrepresentedTokens: z.boolean().optional(),
  wrongLiquidity: z.boolean().optional(),
  doublecounted: z.boolean().optional(),
  hallmarks: z.array(z.any()).optional(),
  dimensions: z.record(z.string(), z.any()).optional(),
  oraclesBreakdown: z.array(z.any()).optional(),
  tvlCodePath: z.string().optional(),

  // Aggregated fee metrics
  total24h: z.number().nullable().optional(),
  total48hto24h: z.number().nullable().optional(),
  total7d: z.number().nullable().optional(),
  total14dto7d: z.number().nullable().optional(),
  total30d: z.number().nullable().optional(),
  total60dto30d: z.number().nullable().optional(),
  total1y: z.number().nullable().optional(),
  totalAllTime: z.number().nullable().optional(),

  // Percentage changes
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
  change_1m: z.number().nullable().optional(),
  change_7dover7d: z.number().nullable().optional(),
  change_30dover30d: z.number().nullable().optional(),

  // Related protocols
  parentProtocol: z.string().nullable().optional(),
  linkedProtocols: z.array(z.string()).nullable().optional(),
  childProtocols: z.array(z.any()).nullable().optional(),
  hasLabelBreakdown: z.boolean().optional(),
  previousNames: z.array(z.string()).nullable().optional(),
  defaultChartView: z.string().nullable().optional(),
  breakdownMethodology: z.any().nullable().optional(),
}).passthrough();

// ============================================================================
// Fees V2 Chart Schema (from /v2/chart/fees/protocol/:name endpoint)
// Returns array of [timestamp, feeValue] tuples
// ============================================================================

export const chartDataPointSchema = z.tuple([z.number(), z.number()]);

export const chartArraySchema = z.array(chartDataPointSchema);

// ============================================================================
// Fees V2 Chart Breakdown Schema
// chain-breakdown: [timestamp, { chainName: feeValue }]
// ============================================================================

export const chartBreakdownPointSchema = z.tuple([z.number(), z.record(z.string(), z.number())]);

export const chartBreakdownArraySchema = z.array(chartBreakdownPointSchema);
