import { z } from 'zod';
import {
  rwaItemSchema,
  rwaCurrentResponseSchema,
  rwaListResponseSchema,
  rwaStatsSchema,
  rwaIdMapSchema,
  rwaChartPointSchema,
  rwaChartResponseSchema,
  rwaBreakdownChartResponseSchema,
  rwaFilterResponseSchema,
} from './schemas';

export type RwaItem = z.infer<typeof rwaItemSchema>;
export type RwaCurrentResponse = z.infer<typeof rwaCurrentResponseSchema>;
export type RwaListResponse = z.infer<typeof rwaListResponseSchema>;
export type RwaStats = z.infer<typeof rwaStatsSchema>;
export type RwaIdMap = z.infer<typeof rwaIdMapSchema>;
export type RwaChartPoint = z.infer<typeof rwaChartPointSchema>;
export type RwaChartResponse = z.infer<typeof rwaChartResponseSchema>;
export type RwaBreakdownChartResponse = z.infer<typeof rwaBreakdownChartResponseSchema>;
export type RwaFilterResponse = z.infer<typeof rwaFilterResponseSchema>;

export function isRwaCurrentResponse(data: unknown): data is RwaCurrentResponse {
  return rwaCurrentResponseSchema.safeParse(data).success;
}

export function isRwaListResponse(data: unknown): data is RwaListResponse {
  return rwaListResponseSchema.safeParse(data).success;
}

export function isRwaIdMap(data: unknown): data is RwaIdMap {
  return rwaIdMapSchema.safeParse(data).success;
}
