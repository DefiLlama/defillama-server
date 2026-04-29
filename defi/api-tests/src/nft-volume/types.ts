import { z } from 'zod';
import {
  nftVolumeProtocolSchema,
  dataChartPointSchema,
  nftVolumeOverviewResponseSchema,
  nftVolumeSummaryResponseSchema,
} from './schemas';

export type NftVolumeProtocol = z.infer<typeof nftVolumeProtocolSchema>;
export type DataChartPoint = z.infer<typeof dataChartPointSchema>;
export type NftVolumeOverviewResponse = z.infer<typeof nftVolumeOverviewResponseSchema>;
export type NftVolumeSummaryResponse = z.infer<typeof nftVolumeSummaryResponseSchema>;

export function isNftVolumeOverviewResponse(data: any): data is NftVolumeOverviewResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.totalDataChart)
  );
}

export function isNftVolumeSummaryResponse(data: any): data is NftVolumeSummaryResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string'
  );
}
