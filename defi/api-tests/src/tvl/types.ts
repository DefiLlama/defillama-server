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
  chainSchema,
  chainTvlSchema,
  tokenTvlSchema,
} from './schemas';

export type Protocol = z.infer<typeof protocolSchema>;
export type ProtocolDetails = z.infer<typeof protocolDetailsSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type HistoricalDataPoint = z.infer<typeof historicalDataPointSchema>;
export type HistoricalTvlPoint = z.infer<typeof historicalTvlPointSchema>;
export type Chain = z.infer<typeof chainSchema>;
export type ChainTvl = z.infer<typeof chainTvlSchema>;
export type TokenTvl = z.infer<typeof tokenTvlSchema>;


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
