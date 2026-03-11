// TypeScript types for Fees V2 API endpoints
// These types are inferred from Zod schemas to ensure consistency

import { z } from 'zod';
import {
  metricsProtocolSchema,
  chartArraySchema,
  chartDataPointSchema,
  chartBreakdownArraySchema,
  chartBreakdownPointSchema,
} from './schemas';

export type MetricsProtocol = z.infer<typeof metricsProtocolSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type ChartArray = z.infer<typeof chartArraySchema>;
export type ChartBreakdownPoint = z.infer<typeof chartBreakdownPointSchema>;
export type ChartBreakdownArray = z.infer<typeof chartBreakdownArraySchema>;

// ============================================================================
// Type Guards
// ============================================================================

export function isMetricsProtocol(data: unknown): data is MetricsProtocol {
  return metricsProtocolSchema.safeParse(data).success;
}

export function isChartArray(data: unknown): data is ChartArray {
  return chartArraySchema.safeParse(data).success;
}

export function isChartBreakdownArray(data: unknown): data is ChartBreakdownArray {
  return chartBreakdownArraySchema.safeParse(data).success;
}
