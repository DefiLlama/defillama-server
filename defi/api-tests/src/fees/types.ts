import { z } from 'zod';
import {
  feeProtocolSchema,
  dataChartPointSchema,
  feeOverviewResponseSchema,
  feeSummaryResponseSchema,
} from './schemas';

// Inferred types
export type FeeProtocol = z.infer<typeof feeProtocolSchema>;
export type DataChartPoint = z.infer<typeof dataChartPointSchema>;
export type FeeOverviewResponse = z.infer<typeof feeOverviewResponseSchema>;
export type FeeSummaryResponse = z.infer<typeof feeSummaryResponseSchema>;

// Type guards
export function isFeeOverviewResponse(data: any): data is FeeOverviewResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.totalDataChart)
  );
}

export function isFeeSummaryResponse(data: any): data is FeeSummaryResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.chains)
  );
}

