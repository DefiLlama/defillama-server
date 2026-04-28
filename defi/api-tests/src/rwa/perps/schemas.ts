import { z } from 'zod';

// ============================================================================
// RWA Perps Market Schema (from /current and /market/:id)
// ============================================================================

export const rwaPerpsMarketSchema = z
  .object({
    id: z.string(),
    timestamp: z.number(),
    contract: z.string(),
    venue: z.string(),
    openInterest: z.number().finite(),
    volume24h: z.number().finite(),
    price: z.number().finite().optional(),
    fundingRate: z.number().finite().nullable().optional(),
    premium: z.number().finite().nullable().optional(),
    cumulativeFunding: z.number().finite().nullable().optional(),
    openInterestChange24h: z.number().finite().nullable().optional(),
    volume24hChange24h: z.number().finite().nullable().optional(),
    priceChange24h: z.number().finite().nullable().optional(),
    referenceAsset: z.string().nullable().optional(),
    referenceAssetGroup: z.string().nullable().optional(),
    assetClass: z.array(z.string()).nullable().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export const rwaPerpsCurrentResponseSchema = z.array(rwaPerpsMarketSchema);

// ============================================================================
// RWA Perps List Schema (from /list)
// ============================================================================

export const rwaPerpsListResponseSchema = z
  .object({
    contracts: z.array(z.string()),
    venues: z.array(z.string()),
    categories: z.array(z.string()),
    assetGroups: z.array(z.string()),
    total: z.number().int().nonnegative(),
  })
  .passthrough();

// ============================================================================
// RWA Perps Stats Schema (from /stats) — flexible, varies by pipeline
// ============================================================================

export const rwaPerpsStatsSchema = z.object({}).passthrough();

// ============================================================================
// RWA Perps ID Map Schema (from /id-map)
// ============================================================================

export const rwaPerpsIdMapSchema = z.record(z.string(), z.string());

// ============================================================================
// RWA Perps Filter Response Schema (from /contract, /venue, /category, /assetGroup)
// All return a plain array of markets
// ============================================================================

export const rwaPerpsFilterResponseSchema = z.array(rwaPerpsMarketSchema);

// ============================================================================
// RWA Perps Chart Response Schemas
// ============================================================================

export const rwaPerpsChartPointSchema = z
  .object({
    timestamp: z.number(),
  })
  .passthrough();

export const rwaPerpsChartResponseSchema = z.array(rwaPerpsChartPointSchema);

// ============================================================================
// RWA Perps Funding History Schema (from /funding/:id)
// ============================================================================

export const rwaPerpsFundingPointSchema = z
  .object({
    timestamp: z.number(),
    id: z.string(),
  })
  .passthrough();

export const rwaPerpsFundingResponseSchema = z.array(rwaPerpsFundingPointSchema);
