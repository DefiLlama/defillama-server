import { z } from 'zod';

// Common wrapper schema
export const yieldsStatusWrapperSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.string(),
    data: dataSchema,
  });

// Pool schema for /yields/pools
export const yieldPoolSchema = z.object({
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number(),
  apyBase: z.union([z.number(), z.null()]).optional(),
  apyReward: z.union([z.number(), z.null()]).optional(),
  apy: z.union([z.number(), z.null()]).optional(),
  rewardTokens: z.union([z.array(z.string()), z.array(z.any()), z.null()]).optional(),
  pool: z.string(),
  apyPct1D: z.union([z.number(), z.null()]).optional(),
  apyPct7D: z.union([z.number(), z.null()]).optional(),
  apyPct30D: z.union([z.number(), z.null()]).optional(),
  stablecoin: z.boolean().optional(),
  ilRisk: z.string().optional(),
  exposure: z.string().optional(),
  predictions: z.record(z.string(), z.any()).optional(),
  poolMeta: z.union([z.string(), z.null()]).optional(),
  mu: z.number().optional(),
  sigma: z.number().optional(),
  count: z.number().optional(),
  outlier: z.boolean().optional(),
  underlyingTokens: z.union([z.array(z.string()), z.null()]).optional(),
  il7d: z.union([z.number(), z.null()]).optional(),
  apyBase7d: z.union([z.number(), z.null()]).optional(),
  apyMean30d: z.union([z.number(), z.null()]).optional(),
  volumeUsd1d: z.union([z.number(), z.null()]).optional(),
  volumeUsd7d: z.union([z.number(), z.null()]).optional(),
  apyBaseInception: z.union([z.number(), z.null()]).optional(),
});

export const poolsResponseSchema = yieldsStatusWrapperSchema(z.array(yieldPoolSchema));

// Old pool schema for /yields/poolsOld
export const oldPoolSchema = z.object({
  pool: z.string(),
  timestamp: z.string(),
  project: z.string(),
  chain: z.string(),
  symbol: z.string(),
  tvlUsd: z.number().optional(),
  apyBase: z.union([z.number(), z.null()]).optional(),
  apyReward: z.union([z.number(), z.null()]).optional(),
  apy: z.union([z.number(), z.null()]).optional(),
  rewardTokens: z.union([z.array(z.string()), z.null()]).optional(),
  il7d: z.union([z.number(), z.null()]).optional(),
  apyBase7d: z.union([z.number(), z.null()]).optional(),
  apyMean30d: z.union([z.number(), z.null()]).optional(),
  volumeUsd1d: z.union([z.number(), z.null()]).optional(),
  volumeUsd7d: z.union([z.number(), z.null()]).optional(),
  apyBaseInception: z.union([z.number(), z.null()]).optional(),
  underlyingTokens: z.array(z.string()).optional(),
  poolMeta: z.string().optional(),
  stablecoin: z.boolean().optional(),
  ilRisk: z.string().optional(),
  exposure: z.string().optional(),
  predictions: z.record(z.string(), z.any()).optional(),
});

export const poolsOldResponseSchema = yieldsStatusWrapperSchema(z.array(oldPoolSchema));

// Borrow pool schema for /yields/poolsBorrow
export const borrowPoolSchema = z.object({
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number(),
  apyBase: z.union([z.number(), z.null()]).optional(),
  apyBaseBorrow: z.union([z.number(), z.null()]).optional(),
  apyRewardBorrow: z.union([z.number(), z.null()]).optional(),
  apyBorrow: z.union([z.number(), z.null()]).optional(),
  rewardTokens: z.union([z.array(z.string()), z.null()]).optional(),
  pool: z.string(),
  ltv: z.union([z.number(), z.null()]).optional(),
  poolMeta: z.union([z.string(), z.null()]).optional(),
  underlyingTokens: z.union([z.array(z.string()), z.null()]).optional(),
  totalSupplyUsd: z.number().optional(),
  totalBorrowUsd: z.union([z.number(), z.record(z.string(), z.any()), z.null()]).optional(),
  debtCeilingUsd: z.union([z.number(), z.null()]).optional(),
  mintedCoin: z.union([z.string(), z.null()]).optional(),
  borrowable: z.union([z.boolean(), z.null()]).optional(),
  borrowFactor: z.union([z.number(), z.null()]).optional(),
});

export const poolsBorrowResponseSchema = yieldsStatusWrapperSchema(z.array(borrowPoolSchema));

// Perp schema for /yields/perps
export const perpSchema = z.object({
  perp_id: z.string(),
  timestamp: z.string(),
  marketplace: z.string(),
  market: z.string(),
  baseAsset: z.string(),
  quoteAsset: z.string().optional(),
  fundingRate: z.union([z.number(), z.null()]).optional(),
  fundingRate30dAverage: z.union([z.number(), z.null()]).optional(),
  fundingRate30dSum: z.union([z.number(), z.null()]).optional(),
  fundingRate7dAverage: z.union([z.number(), z.null()]).optional(),
  fundingRate7dSum: z.union([z.number(), z.null()]).optional(),
  fundingRatePrevious: z.union([z.number(), z.null()]).optional(),
  fundingTimePrevious: z.union([z.number(), z.null()]).optional(),
  indexPrice: z.union([z.number(), z.null()]).optional(),
  openInterest: z.union([z.number(), z.null()]).optional(),
  volume: z.union([z.number(), z.null()]).optional(),
  pricePercentChange: z.union([z.number(), z.null()]).optional(),
  nextFundingTime: z.union([z.string(), z.null()]).optional(),
});

export const perpsResponseSchema = yieldsStatusWrapperSchema(z.array(perpSchema));

// LSD Rates schema for /yields/lsdRates
export const lsdRateSchema = z.object({
  address: z.string().optional(),
  ethPeg: z.union([z.number(), z.null()]).optional(),
  expectedRate: z.union([z.number(), z.null()]).optional(),
  fee: z.union([z.number(), z.null()]).optional(),
  marketRate: z.union([z.number(), z.null()]).optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  type: z.union([z.string(), z.null()]).optional(),
  timestamp: z.string().optional(),
  pool: z.string().optional(),
  apy: z.union([z.number(), z.null()]).optional(),
  tvl: z.union([z.number(), z.null()]).optional(),
  underlying: z.string().optional(),
  project: z.string().optional(),
  chain: z.string().optional(),
});

export const lsdRatesResponseSchema = z.array(lsdRateSchema);

// Chart schema for /yields/chart/{pool}
export const chartDataPointSchema = z.object({
  timestamp: z.string(),
  tvlUsd: z.number().optional(),
  apy: z.union([z.number(), z.null()]).optional(),
  apyBase: z.union([z.number(), z.null()]).optional(),
  apyReward: z.union([z.number(), z.null()]).optional(),
  il7d: z.union([z.number(), z.null()]).optional(),
  apyBase7d: z.union([z.number(), z.null()]).optional(),
  apyMean30d: z.union([z.number(), z.null()]).optional(),
});

export const chartResponseSchema = yieldsStatusWrapperSchema(z.array(chartDataPointSchema));

// Chart Lend Borrow schema for /yields/chartLendBorrow/{pool}
export const chartLendBorrowDataPointSchema = z.object({
  timestamp: z.string(),
  totalSupplyUsd: z.number().optional(),
  totalBorrowUsd: z.number().optional(),
  apyBase: z.union([z.number(), z.null()]).optional(),
  apyBaseBorrow: z.union([z.number(), z.null()]).optional(),
  apyRewardBorrow: z.union([z.number(), z.null()]).optional(),
  apyBorrow: z.union([z.number(), z.null()]).optional(),
  debtCeilingUsd: z.union([z.number(), z.null()]).optional(),
  ltv: z.union([z.number(), z.null()]).optional(),
});

export const chartLendBorrowResponseSchema = yieldsStatusWrapperSchema(
  z.array(chartLendBorrowDataPointSchema)
);

