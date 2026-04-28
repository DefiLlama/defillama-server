import { z } from 'zod';
import {
  rwaPerpsMarketSchema,
  rwaPerpsCurrentResponseSchema,
  rwaPerpsListResponseSchema,
  rwaPerpsStatsSchema,
  rwaPerpsIdMapSchema,
  rwaPerpsFilterResponseSchema,
  rwaPerpsChartPointSchema,
  rwaPerpsChartResponseSchema,
  rwaPerpsFundingPointSchema,
  rwaPerpsFundingResponseSchema,
} from './schemas';

export type RwaPerpsMarket = z.infer<typeof rwaPerpsMarketSchema>;
export type RwaPerpsCurrentResponse = z.infer<typeof rwaPerpsCurrentResponseSchema>;
export type RwaPerpsListResponse = z.infer<typeof rwaPerpsListResponseSchema>;
export type RwaPerpsStats = z.infer<typeof rwaPerpsStatsSchema>;
export type RwaPerpsIdMap = z.infer<typeof rwaPerpsIdMapSchema>;
export type RwaPerpsFilterResponse = z.infer<typeof rwaPerpsFilterResponseSchema>;
export type RwaPerpsChartPoint = z.infer<typeof rwaPerpsChartPointSchema>;
export type RwaPerpsChartResponse = z.infer<typeof rwaPerpsChartResponseSchema>;
export type RwaPerpsFundingPoint = z.infer<typeof rwaPerpsFundingPointSchema>;
export type RwaPerpsFundingResponse = z.infer<typeof rwaPerpsFundingResponseSchema>;

export function isRwaPerpsCurrentResponse(data: unknown): data is RwaPerpsCurrentResponse {
  return rwaPerpsCurrentResponseSchema.safeParse(data).success;
}

export function isRwaPerpsListResponse(data: unknown): data is RwaPerpsListResponse {
  return rwaPerpsListResponseSchema.safeParse(data).success;
}

export function isRwaPerpsIdMap(data: unknown): data is RwaPerpsIdMap {
  return rwaPerpsIdMapSchema.safeParse(data).success;
}
