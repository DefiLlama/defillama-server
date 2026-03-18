import { z } from 'zod';
import {
  activeUsersProtocolSchema,
  dataChartPointSchema,
  activeUsersOverviewResponseSchema,
  activeUsersSummaryResponseSchema,
} from './schemas';

export type ActiveUsersProtocol = z.infer<typeof activeUsersProtocolSchema>;
export type DataChartPoint = z.infer<typeof dataChartPointSchema>;
export type ActiveUsersOverviewResponse = z.infer<typeof activeUsersOverviewResponseSchema>;
export type ActiveUsersSummaryResponse = z.infer<typeof activeUsersSummaryResponseSchema>;

export function isActiveUsersOverviewResponse(data: any): data is ActiveUsersOverviewResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.totalDataChart)
  );
}

export function isActiveUsersSummaryResponse(data: any): data is ActiveUsersSummaryResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string'
  );
}
