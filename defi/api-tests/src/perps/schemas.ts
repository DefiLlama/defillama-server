import { z } from 'zod';

// Open interest data point (tuple format)
export const openInterestPointSchema = z.tuple([z.number(), z.number()]);

// Open interest response - can be either an array or an aggregated object
export const openInterestResponseSchema = z.union([
  z.array(openInterestPointSchema),
  z.object({
    // Aggregated metrics
    total24h: z.union([z.number(), z.null()]).optional(),
    total48hto24h: z.union([z.number(), z.null()]).optional(),
    total7d: z.union([z.number(), z.null()]).optional(),
    total30d: z.union([z.number(), z.null()]).optional(),
    totalAllTime: z.union([z.number(), z.null()]).optional(),
    change_1d: z.union([z.number(), z.null()]).optional(),
    protocols: z.array(z.any()).optional(),
    allChains: z.array(z.string()).optional(),
    totalDataChart: z.array(z.tuple([z.number(), z.number()])).optional(),
  }).passthrough(),
]);

// Chart item schema
export const perpsChartItemSchema = z.object({
  timestamp: z.number(),
  dailyVolume: z.union([z.number(), z.null()]).optional(),
  dailyOpenInterest: z.union([z.number(), z.null()]).optional(),
  dailyFees: z.union([z.number(), z.null()]).optional(),
  dailyRevenue: z.union([z.number(), z.null()]).optional(),
  dailyPremiumVolume: z.union([z.number(), z.null()]).optional(),
});

// Overview item schema (for derivatives list)
export const perpsOverviewItemSchema = z.object({
  // Protocol metadata
  defillamaId: z.union([z.string(), z.null()]).optional(),
  name: z.string(),
  displayName: z.union([z.string(), z.null()]).optional(),
  module: z.union([z.string(), z.null()]).optional(),
  category: z.union([z.string(), z.null()]).optional(),
  logo: z.union([z.string(), z.null()]).optional(),
  chains: z.array(z.string()).optional(),
  protocolType: z.union([z.string(), z.null()]).optional(),
  methodologyURL: z.union([z.string(), z.null()]).optional(),
  methodology: z.union([z.string(), z.record(z.string(), z.string()), z.null()]).optional(),
  slug: z.union([z.string(), z.null()]).optional(),
  id: z.union([z.string(), z.null()]).optional(),
  
  // Metrics
  total24h: z.union([z.number(), z.null()]).optional(),
  total48hto24h: z.union([z.number(), z.null()]).optional(),
  total7d: z.union([z.number(), z.null()]).optional(),
  total30d: z.union([z.number(), z.null()]).optional(),
  totalAllTime: z.union([z.number(), z.null()]).optional(),
  change_1d: z.union([z.number(), z.null()]).optional(),
  
  // Chart data
  totalDataChart: z.array(z.tuple([z.number(), z.number()])).optional(),
  totalDataChartBreakdown: z.union([
    z.array(perpsChartItemSchema),
    z.array(z.tuple([z.number(), z.number()])),
    z.array(z.any()),
  ]).optional(),
  
  // Additional fields
  url: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  gecko_id: z.union([z.string(), z.null()]).optional(),
  cmcId: z.union([z.string(), z.null()]).optional(),
  twitter: z.union([z.string(), z.null()]).optional(),
  treasury: z.union([z.string(), z.null()]).optional(),
  governanceID: z.union([z.array(z.string()), z.null()]).optional(),
  github: z.union([z.array(z.string()), z.null()]).optional(),
  symbol: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  linkedProtocols: z.union([z.array(z.string()), z.null()]).optional(),
  childProtocols: z.union([z.array(z.any()), z.null()]).optional(),
  parentProtocol: z.union([z.string(), z.null()]).optional(),
  forkedFrom: z.union([z.array(z.string()), z.null()]).optional(),
  audits: z.union([z.string(), z.null()]).optional(),
  audit_links: z.union([z.array(z.string()), z.null()]).optional(),
  referralUrl: z.union([z.string(), z.null()]).optional(),
  hasLabelBreakdown: z.union([z.boolean(), z.null()]).optional(),
  previousNames: z.union([z.array(z.string()), z.null()]).optional(),
  hallmarks: z.union([z.array(z.any()), z.null()]).optional(),
  defaultChartView: z.union([z.string(), z.null()]).optional(),
  doublecounted: z.union([z.boolean(), z.null()]).optional(),
  breakdownMethodology: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
});

// Aggregated overview response schema
export const perpsAggregatedOverviewSchema = z.object({
  // Aggregated metrics
  total24h: z.union([z.number(), z.null()]).optional(),
  total48hto24h: z.union([z.number(), z.null()]).optional(),
  total7d: z.union([z.number(), z.null()]).optional(),
  total14dto7d: z.union([z.number(), z.null()]).optional(),
  total30d: z.union([z.number(), z.null()]).optional(),
  total60dto30d: z.union([z.number(), z.null()]).optional(),
  total1y: z.union([z.number(), z.null()]).optional(),
  totalAllTime: z.union([z.number(), z.null()]).optional(),
  total7DaysAgo: z.union([z.number(), z.null()]).optional(),
  total30DaysAgo: z.union([z.number(), z.null()]).optional(),
  
  // Change percentages
  change_1d: z.union([z.number(), z.null()]).optional(),
  change_7d: z.union([z.number(), z.null()]).optional(),
  change_1m: z.union([z.number(), z.null()]).optional(),
  change_7dover7d: z.union([z.number(), z.null()]).optional(),
  change_30dover30d: z.union([z.number(), z.null()]).optional(),
  
  // Protocols array
  protocols: z.array(perpsOverviewItemSchema).optional(),
  
  // Chain data
  allChains: z.array(z.string()).optional(),
  chain: z.union([z.string(), z.null()]).optional(),
  
  // Chart data
  totalDataChart: z.array(z.tuple([z.number(), z.number()])).optional(),
  totalDataChartBreakdown: z.union([
    z.array(perpsChartItemSchema),
    z.array(z.tuple([z.number(), z.number()])),
    z.array(z.any()),
  ]).optional(),
  
  // Breakdowns
  breakdown24h: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
  breakdown30d: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
});

// Overview response - Note: This endpoint returns aggregated data
export const perpsOverviewResponseSchema = perpsAggregatedOverviewSchema;

// Summary response (single protocol with detailed data)
export const perpsSummaryResponseSchema = perpsOverviewItemSchema;

