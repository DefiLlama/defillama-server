import { z } from 'zod';
import {
  newUsersProtocolSchema,
  dataChartPointSchema,
  newUsersOverviewResponseSchema,
  newUsersSummaryResponseSchema,
} from './schemas';

export type NewUsersProtocol = z.infer<typeof newUsersProtocolSchema>;
export type DataChartPoint = z.infer<typeof dataChartPointSchema>;
export type NewUsersOverviewResponse = z.infer<typeof newUsersOverviewResponseSchema>;
export type NewUsersSummaryResponse = z.infer<typeof newUsersSummaryResponseSchema>;

export function isNewUsersOverviewResponse(data: any): data is NewUsersOverviewResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.totalDataChart)
  );
}

export function isNewUsersSummaryResponse(data: any): data is NewUsersSummaryResponse {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string'
  );
}
