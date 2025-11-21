import { z } from 'zod';

// Transaction counts schema
export const transactionCountsSchema = z.object({
  deposits: z.number(),
  withdrawals: z.number(),
});

// Chain breakdown item schema
export const chainBreakdownItemSchema = z.object({
  lastHourlyVolume: z.union([z.number(), z.null()]).optional(),
  currentDayVolume: z.union([z.number(), z.null()]).optional(),
  lastDailyVolume: z.union([z.number(), z.null()]).optional(),
  dayBeforeLastVolume: z.union([z.number(), z.null()]).optional(),
  weeklyVolume: z.union([z.number(), z.null()]).optional(),
  monthlyVolume: z.union([z.number(), z.null()]).optional(),
  last24hVolume: z.union([z.number(), z.null()]).optional(),
  lastHourlyTxs: transactionCountsSchema.optional(),
  currentDayTxs: transactionCountsSchema.optional(),
  prevDayTxs: transactionCountsSchema.optional(),
  dayBeforeLastTxs: transactionCountsSchema.optional(),
  weeklyTxs: transactionCountsSchema.optional(),
  monthlyTxs: transactionCountsSchema.optional(),
});

// Bridge list item schema
export const bridgeListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  icon: z.string().optional().nullable(),
  volumePrevDay: z.union([z.number(), z.null()]).optional(),
  volumePrev2Day: z.union([z.number(), z.null()]).optional(),
  lastHourlyVolume: z.union([z.number(), z.null()]).optional(),
  last24hVolume: z.union([z.number(), z.null()]).optional(),
  lastDailyVolume: z.union([z.number(), z.null()]).optional(),
  dayBeforeLastVolume: z.union([z.number(), z.null()]).optional(),
  weeklyVolume: z.union([z.number(), z.null()]).optional(),
  monthlyVolume: z.union([z.number(), z.null()]).optional(),
  chains: z.array(z.string()),
  destinationChain: z.union([z.string(), z.boolean()]).optional().nullable(),
  url: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
});

// Bridges list response schema
export const bridgesListResponseSchema = z.object({
  bridges: z.array(bridgeListItemSchema),
});

// Bridge detail schema
export const bridgeDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  icon: z.string().optional().nullable(),
  lastHourlyVolume: z.union([z.number(), z.null()]).optional(),
  currentDayVolume: z.union([z.number(), z.null()]).optional(),
  lastDailyVolume: z.union([z.number(), z.null()]).optional(),
  dayBeforeLastVolume: z.union([z.number(), z.null()]).optional(),
  weeklyVolume: z.union([z.number(), z.null()]).optional(),
  monthlyVolume: z.union([z.number(), z.null()]).optional(),
  lastHourlyTxs: transactionCountsSchema.optional(),
  currentDayTxs: transactionCountsSchema.optional(),
  prevDayTxs: transactionCountsSchema.optional(),
  dayBeforeLastTxs: transactionCountsSchema.optional(),
  weeklyTxs: transactionCountsSchema.optional(),
  monthlyTxs: transactionCountsSchema.optional(),
  chainBreakdown: z.record(z.string(), chainBreakdownItemSchema).optional(),
  chains: z.array(z.string()).optional(),
  destinationChain: z.union([z.string(), z.boolean()]).optional().nullable(),
  url: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
});

// Bridge volume/stats can be arrays or objects - using flexible schema
export const bridgeVolumeResponseSchema = z.union([
  z.array(z.any()),
  z.record(z.string(), z.any()),
  z.object({}).passthrough(),
]);

// Bridge day stats response schema
export const bridgeDayStatsResponseSchema = z.union([
  z.array(z.any()),
  z.record(z.string(), z.any()),
  z.object({}).passthrough(),
]);

// Transactions response schema
export const transactionsResponseSchema = z.union([
  z.array(z.any()),
  z.record(z.string(), z.any()),
  z.object({}).passthrough(),
]);

