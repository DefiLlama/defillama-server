import { z } from 'zod';

// Protocol schema for overview responses
export const volumeProtocolSchema = z.object({
  name: z.string(),
  disabled: z.boolean().optional().nullable(),
  displayName: z.string().optional().nullable(),
  module: z.string(),
  category: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  change_1d: z.union([z.number(), z.null()]).optional(),
  change_7d: z.union([z.number(), z.null()]).optional(),
  change_1m: z.union([z.number(), z.null()]).optional(),
  change_7dover7d: z.union([z.number(), z.null()]).optional(),
  change_30dover30d: z.union([z.number(), z.null()]).optional(),
  total24h: z.union([z.number(), z.null()]).optional(),
  total7d: z.union([z.number(), z.null()]).optional(),
  total30d: z.union([z.number(), z.null()]).optional(),
  totalAllTime: z.union([z.number(), z.null()]).optional(),
  chains: z.array(z.string()).optional(),
  protocolType: z.string().optional().nullable(),
  methodologyURL: z.string().optional().nullable(),
  methodology: z.union([z.string(), z.record(z.string(), z.string())]).optional().nullable(),
  latestFetchIsOk: z.boolean().optional(),
  dailyVolume: z.union([z.number(), z.string()]).optional().nullable(),
  dailyUserFees: z.union([z.number(), z.string()]).optional().nullable(),
  dailyRevenue: z.union([z.number(), z.string()]).optional().nullable(),
  dailyHoldersRevenue: z.union([z.number(), z.string()]).optional().nullable(),
  dailySupplySideRevenue: z.union([z.number(), z.string()]).optional().nullable(),
  dailyProtocolRevenue: z.union([z.number(), z.string()]).optional().nullable(),
  dailyPremiumVolume: z.union([z.number(), z.string()]).optional().nullable(),
  defillamaId: z.string().optional().nullable(),
  parentProtocol: z.string().optional().nullable(),
});

// Data chart point schema [timestamp, value]
export const dataChartPointSchema = z.tuple([
  z.number(), // timestamp
  z.union([z.number(), z.string()]) // value (can be number or string)
]);

// Overview response schema (for /overview/dexs and /overview/options)
export const volumeOverviewResponseSchema = z.object({
  protocols: z.array(volumeProtocolSchema),
  totalDataChart: z.array(dataChartPointSchema),
  totalDataChartBreakdown: z.array(z.array(z.any())).optional().nullable(),
  allChains: z.array(z.string()).optional(),
  chain: z.string().optional().nullable(),
  total24h: z.union([z.number(), z.null()]).optional(),
  total7d: z.union([z.number(), z.null()]).optional(),
  change_1d: z.union([z.number(), z.null()]).optional(),
  change_7d: z.union([z.number(), z.null()]).optional(),
  change_1m: z.union([z.number(), z.null()]).optional(),
});

// Summary protocol response schema (for /summary/dexs/{protocol} and /summary/options/{protocol})
export const volumeSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  gecko_id: z.string().optional().nullable(),
  cmcId: z.string().optional().nullable(),
  chains: z.array(z.string()),
  twitter: z.string().optional().nullable(),
  treasury: z.string().optional().nullable(),
  governanceID: z.array(z.string()).optional().nullable(),
  github: z.array(z.string()).optional().nullable(),
  symbol: z.string().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  module: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  methodologyURL: z.string().optional().nullable(),
  methodology: z.union([z.string(), z.record(z.string(), z.string())]).optional().nullable(),
  protocolType: z.string().optional().nullable(),
  disabled: z.boolean().optional().nullable(),
  displayName: z.string().optional().nullable(),
  latestFetchIsOk: z.boolean().optional(),
  total24h: z.union([z.number(), z.null()]).optional(),
  total7d: z.union([z.number(), z.null()]).optional(),
  total30d: z.union([z.number(), z.null()]).optional(),
  totalAllTime: z.union([z.number(), z.null()]).optional(),
  change_1d: z.union([z.number(), z.null()]).optional(),
  change_7d: z.union([z.number(), z.null()]).optional(),
  change_1m: z.union([z.number(), z.null()]).optional(),
  totalDataChart: z.array(dataChartPointSchema).optional(),
  totalDataChartBreakdown: z.array(z.array(z.any())).optional().nullable(),
  chainBreakdown: z.record(z.string(), z.any()).optional().nullable(),
  versionKey: z.string().optional().nullable(),
  parentProtocol: z.string().optional().nullable(),
});

