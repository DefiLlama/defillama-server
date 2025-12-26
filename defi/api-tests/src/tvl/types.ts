// TypeScript types for TVL API endpoints
// These types are inferred from Zod schemas to ensure consistency
// Source reference: defi/src/protocols/types.ts

import { z } from 'zod';
import {
  protocolSchema,
  protocolDetailsSchema,
  chartDataPointSchema,
  historicalDataPointSchema,
  historicalTvlPointSchema,
  historicalChainTvlPointSchema,
  historicalChainTvlArraySchema,
  chainSchema,
  chainTvlSchema,
  tokenTvlSchema,
  protocolTvlSchema,
  chainsV2ArraySchema,
  chainAssetsSchema,
  tokenProtocolSchema,
  tokenProtocolsArraySchema,
  inflowsSchema,
  tokenTvlDataSchema,
} from './schemas';

export type Protocol = z.infer<typeof protocolSchema>;
export type ProtocolDetails = z.infer<typeof protocolDetailsSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type HistoricalDataPoint = z.infer<typeof historicalDataPointSchema>;
export type HistoricalTvlPoint = z.infer<typeof historicalTvlPointSchema>;
export type HistoricalChainTvlPoint = z.infer<typeof historicalChainTvlPointSchema>;
export type HistoricalChainTvl = z.infer<typeof historicalChainTvlArraySchema>;
export type Chain = z.infer<typeof chainSchema>;
export type ChainTvl = z.infer<typeof chainTvlSchema>;
export type TokenTvl = z.infer<typeof tokenTvlSchema>;
export type ProtocolTvl = z.infer<typeof protocolTvlSchema>;
export type ChainsV2 = z.infer<typeof chainsV2ArraySchema>;
export type ChainAssets = z.infer<typeof chainAssetsSchema>;
export type TokenProtocol = z.infer<typeof tokenProtocolSchema>;
export type TokenProtocols = z.infer<typeof tokenProtocolsArraySchema>;
export type Inflows = z.infer<typeof inflowsSchema>;
export type TokenTvlData = z.infer<typeof tokenTvlDataSchema>;


// ============================================================================
// Type Guards
// ============================================================================

export function isProtocol(data: unknown): data is Protocol {
  return protocolSchema.safeParse(data).success;
}

export function isProtocolArray(data: unknown): data is Protocol[] {
  return Array.isArray(data) && (data.length === 0 || isProtocol(data[0]));
}

export function isProtocolDetails(data: unknown): data is ProtocolDetails {
  return protocolDetailsSchema.safeParse(data).success;
}

export function isChartDataPoint(data: unknown): data is ChartDataPoint {
  return chartDataPointSchema.safeParse(data).success;
}

export function isChartDataArray(data: unknown): data is ChartDataPoint[] {
  return Array.isArray(data) && (data.length === 0 || isChartDataPoint(data[0]));
}

export function isChain(data: unknown): data is Chain {
  return chainSchema.safeParse(data).success;
}

export function isHistoricalChainTvlPoint(data: unknown): data is HistoricalChainTvlPoint {
  return historicalChainTvlPointSchema.safeParse(data).success;
}

export function isHistoricalChainTvl(data: unknown): data is HistoricalChainTvl {
  return historicalChainTvlArraySchema.safeParse(data).success;
}

export function isProtocolTvl(data: unknown): data is ProtocolTvl {
  return protocolTvlSchema.safeParse(data).success;
}

export function isChainsV2(data: unknown): data is ChainsV2 {
  return chainsV2ArraySchema.safeParse(data).success;
}

export function isChainAssets(data: unknown): data is ChainAssets {
  return chainAssetsSchema.safeParse(data).success;
}

export function isTokenProtocol(data: unknown): data is TokenProtocol {
  return tokenProtocolSchema.safeParse(data).success;
}

export function isTokenProtocols(data: unknown): data is TokenProtocols {
  return tokenProtocolsArraySchema.safeParse(data).success;
}

export function isInflows(data: unknown): data is Inflows {
  return inflowsSchema.safeParse(data).success;
}
