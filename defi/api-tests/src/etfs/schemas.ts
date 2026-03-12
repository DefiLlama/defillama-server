import { z } from 'zod';

// ETF snapshot item schema
export const etfSnapshotSchema = z.object({
  ticker: z.string(),
  timestamp: z.number(),
  asset: z.string(),
  issuer: z.string(),
  etf_name: z.string(),
  custodian: z.string().optional().nullable(),
  pct_fee: z.number().optional().nullable(),
  url: z.string().optional().nullable(),
  flows: z.union([z.number(), z.null()]).optional(),
  aum: z.union([z.number(), z.null()]).optional(),
  volume: z.union([z.number(), z.null()]).optional(),
});

// ETF snapshot response schema (array)
export const etfSnapshotResponseSchema = z.array(etfSnapshotSchema);

// ETF flow item schema
export const etfFlowSchema = z.object({
  gecko_id: z.string(),
  day: z.string(), // ISO date string
  total_flow_usd: z.union([z.number(), z.null()]),
});

// ETF flows response schema (array)
export const etfFlowsResponseSchema = z.array(etfFlowSchema);

