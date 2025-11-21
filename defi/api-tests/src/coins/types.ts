import { z } from 'zod';
import {
  coinPriceSchema,
  pricesCurrentResponseSchema,
  pricesHistoricalResponseSchema,
  chartPricePointSchema,
  chartCoinDataSchema,
  chartResponseSchema,
  percentageResponseSchema,
  firstPriceSchema,
  pricesFirstResponseSchema,
  blockResponseSchema,
} from './schemas';

// Infer types from schemas
export type CoinPrice = z.infer<typeof coinPriceSchema>;
export type PricesCurrentResponse = z.infer<typeof pricesCurrentResponseSchema>;
export type PricesHistoricalResponse = z.infer<typeof pricesHistoricalResponseSchema>;

export type ChartPricePoint = z.infer<typeof chartPricePointSchema>;
export type ChartCoinData = z.infer<typeof chartCoinDataSchema>;
export type ChartResponse = z.infer<typeof chartResponseSchema>;

export type PercentageResponse = z.infer<typeof percentageResponseSchema>;

export type FirstPrice = z.infer<typeof firstPriceSchema>;
export type PricesFirstResponse = z.infer<typeof pricesFirstResponseSchema>;

export type BlockResponse = z.infer<typeof blockResponseSchema>;

// Type guards
export function isPricesCurrentResponse(data: unknown): data is PricesCurrentResponse {
  return pricesCurrentResponseSchema.safeParse(data).success;
}

export function isPricesHistoricalResponse(data: unknown): data is PricesHistoricalResponse {
  return pricesHistoricalResponseSchema.safeParse(data).success;
}

export function isChartResponse(data: unknown): data is ChartResponse {
  return chartResponseSchema.safeParse(data).success;
}

export function isPercentageResponse(data: unknown): data is PercentageResponse {
  return percentageResponseSchema.safeParse(data).success;
}

export function isPricesFirstResponse(data: unknown): data is PricesFirstResponse {
  return pricesFirstResponseSchema.safeParse(data).success;
}

export function isBlockResponse(data: unknown): data is BlockResponse {
  return blockResponseSchema.safeParse(data).success;
}

