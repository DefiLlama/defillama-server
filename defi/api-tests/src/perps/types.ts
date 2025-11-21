import { z } from 'zod';
import {
  openInterestPointSchema,
  openInterestResponseSchema,
  perpsChartItemSchema,
  perpsOverviewItemSchema,
  perpsOverviewResponseSchema,
  perpsSummaryResponseSchema,
} from './schemas';

// Inferred types
export type OpenInterestPoint = z.infer<typeof openInterestPointSchema>;
export type OpenInterestResponse = z.infer<typeof openInterestResponseSchema>;
export type PerpsChartItem = z.infer<typeof perpsChartItemSchema>;
export type PerpsOverviewItem = z.infer<typeof perpsOverviewItemSchema>;
export type PerpsOverviewResponse = z.infer<typeof perpsOverviewResponseSchema>;
export type PerpsSummaryResponse = z.infer<typeof perpsSummaryResponseSchema>;

// Type guards
export function isOpenInterestResponse(data: any): data is OpenInterestResponse {
  return (
    (Array.isArray(data) && data.every((item) => Array.isArray(item) && item.length === 2)) ||
    (data && typeof data === 'object' && !Array.isArray(data))
  );
}

export function isPerpsOverviewResponse(data: any): data is PerpsOverviewResponse {
  return data && typeof data === 'object' && ('protocols' in data || 'total24h' in data);
}

export function isPerpsSummaryResponse(data: any): data is PerpsSummaryResponse {
  return data && typeof data === 'object' && 'name' in data;
}

