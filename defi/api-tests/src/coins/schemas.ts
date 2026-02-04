import { z } from 'zod';

// Common coin price schema
export const coinPriceSchema = z.object({
  decimals: z.number().optional(),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.number(),
  confidence: z.number().optional(),
});

// Schema for /prices/current/{coins}
export const pricesCurrentResponseSchema = z.object({
  coins: z.record(z.string(), coinPriceSchema),
});

// Schema for /prices/historical/{timestamp}/{coins}
export const pricesHistoricalResponseSchema = z.object({
  coins: z.record(z.string(), coinPriceSchema),
});

// Schema for /chart/{coins}
export const chartPricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
});

export const chartCoinDataSchema = z.object({
  symbol: z.string(),
  confidence: z.number(),
  decimals: z.number().optional(),
  prices: z.array(chartPricePointSchema),
});

export const chartResponseSchema = z.object({
  coins: z.record(z.string(), chartCoinDataSchema),
});

// Schema for /percentage/{coins}
export const percentageResponseSchema = z.object({
  coins: z.record(z.string(), z.number()),
});

// Schema for /prices/first/{coins}
export const firstPriceSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  timestamp: z.number(),
});

export const pricesFirstResponseSchema = z.object({
  coins: z.record(z.string(), firstPriceSchema),
});

// Schema for /block/{chain}/{timestamp}
export const blockResponseSchema = z.object({
  height: z.number(),
  timestamp: z.number(),
});

