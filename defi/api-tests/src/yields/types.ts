import { z } from 'zod';
import {
  yieldPoolSchema,
  poolsResponseSchema,
  oldPoolSchema,
  poolsOldResponseSchema,
  borrowPoolSchema,
  poolsBorrowResponseSchema,
  perpSchema,
  perpsResponseSchema,
  lsdRateSchema,
  lsdRatesResponseSchema,
  chartDataPointSchema,
  chartResponseSchema,
  chartLendBorrowDataPointSchema,
  chartLendBorrowResponseSchema,
} from './schemas';

// Infer types from schemas
export type YieldPool = z.infer<typeof yieldPoolSchema>;
export type PoolsResponse = z.infer<typeof poolsResponseSchema>;

export type OldPool = z.infer<typeof oldPoolSchema>;
export type PoolsOldResponse = z.infer<typeof poolsOldResponseSchema>;

export type BorrowPool = z.infer<typeof borrowPoolSchema>;
export type PoolsBorrowResponse = z.infer<typeof poolsBorrowResponseSchema>;

export type Perp = z.infer<typeof perpSchema>;
export type PerpsResponse = z.infer<typeof perpsResponseSchema>;

export type LsdRate = z.infer<typeof lsdRateSchema>;
export type LsdRatesResponse = z.infer<typeof lsdRatesResponseSchema>;

export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type ChartResponse = z.infer<typeof chartResponseSchema>;

export type ChartLendBorrowDataPoint = z.infer<typeof chartLendBorrowDataPointSchema>;
export type ChartLendBorrowResponse = z.infer<typeof chartLendBorrowResponseSchema>;

// Type guards
export function isPoolsResponse(data: unknown): data is PoolsResponse {
  return poolsResponseSchema.safeParse(data).success;
}

export function isPoolsOldResponse(data: unknown): data is PoolsOldResponse {
  return poolsOldResponseSchema.safeParse(data).success;
}

export function isPoolsBorrowResponse(data: unknown): data is PoolsBorrowResponse {
  return poolsBorrowResponseSchema.safeParse(data).success;
}

export function isPerpsResponse(data: unknown): data is PerpsResponse {
  return perpsResponseSchema.safeParse(data).success;
}

export function isLsdRatesResponse(data: unknown): data is LsdRatesResponse {
  return lsdRatesResponseSchema.safeParse(data).success;
}

export function isChartResponse(data: unknown): data is ChartResponse {
  return chartResponseSchema.safeParse(data).success;
}

export function isChartLendBorrowResponse(data: unknown): data is ChartLendBorrowResponse {
  return chartLendBorrowResponseSchema.safeParse(data).success;
}

