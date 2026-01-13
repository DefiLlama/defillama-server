import { z } from 'zod';

// ============================================================================
// Active Users Schema (from /api/activeUsers endpoint)
// ============================================================================

// Metric value schema - each metric has a value and end timestamp
const metricValueSchema = z.object({
  value: z.union([z.number().finite(), z.string()]), // Can be number or string
  end: z.number().finite(), // Unix timestamp
}).passthrough();

export const activeUserItemSchema = z.object({
  name: z.string().min(1).optional(), // Optional for chain aggregates
  users: metricValueSchema.optional(),
  txs: metricValueSchema.optional(),
  gasUsd: metricValueSchema.optional(),
  newUsers: metricValueSchema.optional(),
  change_1d: z.union([z.number().finite(), metricValueSchema]).nullable().optional(),
  change_7d: z.union([z.number().finite(), metricValueSchema]).nullable().optional(),
  change_1m: z.union([z.number().finite(), metricValueSchema]).nullable().optional(),
}).passthrough(); // Allow additional fields

// Response is a record with protocol IDs as keys
export const activeUsersResponseSchema = z.record(z.string(), activeUserItemSchema);

// ============================================================================
// User Data Schema (from /api/userData/{type}/{protocolId} endpoint)
// ============================================================================

// API returns array tuples: [timestamp, value]
// where value can be a number or string representation of a number
export const userDataPointSchema = z.tuple([
  z.number().finite(), // timestamp
  z.union([z.number().finite(), z.string()]), // value (number or string)
]);

export const userDataArraySchema = z.array(userDataPointSchema);

