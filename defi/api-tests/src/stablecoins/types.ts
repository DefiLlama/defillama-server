// TypeScript types for Stablecoins API endpoints
// These types are inferred from Zod schemas to ensure consistency

import { z } from 'zod';
import {
  stablecoinSchema,
  stablecoinsArraySchema,
  stablecoinsListResponseSchema,
  stablecoinAssetSchema,
  stablecoinChainSchema,
  stablecoinChainsArraySchema,
  stablecoinPriceSchema,
  stablecoinPricesArraySchema,
  stablecoinChartPointSchema,
  stablecoinChartsArraySchema,
  stablecoinDominanceSchema,
  stablecoinDominanceArraySchema,
} from './schemas';

export type Stablecoin = z.infer<typeof stablecoinSchema>;
export type Stablecoins = z.infer<typeof stablecoinsArraySchema>;
export type StablecoinsListResponse = z.infer<typeof stablecoinsListResponseSchema>;
export type StablecoinAsset = z.infer<typeof stablecoinAssetSchema>;
export type StablecoinChain = z.infer<typeof stablecoinChainSchema>;
export type StablecoinChains = z.infer<typeof stablecoinChainsArraySchema>;
export type StablecoinPrice = z.infer<typeof stablecoinPriceSchema>;
export type StablecoinPrices = z.infer<typeof stablecoinPricesArraySchema>;
export type StablecoinChartPoint = z.infer<typeof stablecoinChartPointSchema>;
export type StablecoinCharts = z.infer<typeof stablecoinChartsArraySchema>;
export type StablecoinDominance = z.infer<typeof stablecoinDominanceSchema>;
export type StablecoinDominanceArray = z.infer<typeof stablecoinDominanceArraySchema>;

// ============================================================================
// Type Guards
// ============================================================================

export function isStablecoin(data: unknown): data is Stablecoin {
  return stablecoinSchema.safeParse(data).success;
}

export function isStablecoins(data: unknown): data is Stablecoins {
  return stablecoinsArraySchema.safeParse(data).success;
}

export function isStablecoinsListResponse(data: unknown): data is StablecoinsListResponse {
  return stablecoinsListResponseSchema.safeParse(data).success;
}

export function isStablecoinAsset(data: unknown): data is StablecoinAsset {
  return stablecoinAssetSchema.safeParse(data).success;
}

export function isStablecoinChains(data: unknown): data is StablecoinChains {
  return stablecoinChainsArraySchema.safeParse(data).success;
}

export function isStablecoinPrices(data: unknown): data is StablecoinPrices {
  return stablecoinPricesArraySchema.safeParse(data).success;
}

export function isStablecoinCharts(data: unknown): data is StablecoinCharts {
  return stablecoinChartsArraySchema.safeParse(data).success;
}

export function isStablecoinDominanceArray(data: unknown): data is StablecoinDominanceArray {
  return stablecoinDominanceArraySchema.safeParse(data).success;
}

