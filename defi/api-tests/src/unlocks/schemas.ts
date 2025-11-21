import { z } from 'zod';

// Schema for emissions list endpoint
export const emissionItemSchema = z.object({
  token: z.string(),
  sources: z.array(z.string()).optional(),
  protocolId: z.string(),
  name: z.string(),
  symbol: z.string().optional(),
  gecko_id: z.union([z.string(), z.null()]).optional(),
  circSupply: z.number().optional(),
  circSupply30d: z.number().optional(),
  totalLocked: z.number().optional(),
  nextEvent: z.object({
    date: z.number().optional(),
    timestamp: z.number().optional(),
    toUnlock: z.number().optional(),
    noOfTokens: z.number().optional(),
    proportion: z.number().optional(),
  }).optional(),
  tokenPrice: z.union([z.number(), z.string()]).optional(),
  mcap: z.number().optional(),
  maxSupply: z.number().optional(),
  unlockedPct: z.number().optional(),
  allocation: z.record(z.string(), z.any()).optional(),
});

export const emissionsResponseSchema = z.array(emissionItemSchema);

// Schema for individual emission endpoint
export const emissionDataPointSchema = z.object({
  timestamp: z.number(),
  unlocked: z.number(),
  rawEmission: z.number().optional(),
  burned: z.number().optional(),
});

export const emissionSeriesSchema = z.object({
  label: z.string(),
  data: z.array(emissionDataPointSchema),
});

export const documentedDataSchema = z.object({
  data: z.array(emissionSeriesSchema),
  categories: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  events: z.array(z.any()).optional(),
});

// The body is a JSON string, so we'll parse it separately
export const emissionResponseSchema = z.object({
  body: z.string(),
  lastModified: z.union([z.string(), z.number()]).optional(),
});

// After parsing the body JSON
export const emissionBodySchema = z.object({
  documentedData: documentedDataSchema.optional(),
  chainData: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  token: z.string().optional(),
  sources: z.array(z.string()).optional(),
});

