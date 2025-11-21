import { z } from 'zod';
import {
  volumeProtocolSchema,
  dataChartPointSchema,
  volumeOverviewResponseSchema,
  volumeSummaryResponseSchema,
} from './schemas';

// Inferred types
export type VolumeProtocol = z.infer<typeof volumeProtocolSchema>;
export type DataChartPoint = z.infer<typeof dataChartPointSchema>;
export type VolumeOverviewResponse = z.infer<typeof volumeOverviewResponseSchema>;
export type VolumeSummaryResponse = z.infer<typeof volumeSummaryResponseSchema>;

// Type guards
export function isVolumeOverviewResponse(data: any): data is VolumeOverviewResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.protocols) &&
    Array.isArray(data.totalDataChart)
  );
}

export function isVolumeSummaryResponse(data: any): data is VolumeSummaryResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.chains)
  );
}

