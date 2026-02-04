import { z } from 'zod';
import {
  emissionItemSchema,
  emissionsResponseSchema,
  emissionDataPointSchema,
  emissionSeriesSchema,
  documentedDataSchema,
  emissionResponseSchema,
  emissionBodySchema,
} from './schemas';

// Infer types from schemas
export type EmissionItem = z.infer<typeof emissionItemSchema>;
export type EmissionsResponse = z.infer<typeof emissionsResponseSchema>;

export type EmissionDataPoint = z.infer<typeof emissionDataPointSchema>;
export type EmissionSeries = z.infer<typeof emissionSeriesSchema>;
export type DocumentedData = z.infer<typeof documentedDataSchema>;
export type EmissionResponse = z.infer<typeof emissionResponseSchema>;
export type EmissionBody = z.infer<typeof emissionBodySchema>;

// Type guards
export function isEmissionsResponse(data: unknown): data is EmissionsResponse {
  return emissionsResponseSchema.safeParse(data).success;
}

export function isEmissionResponse(data: unknown): data is EmissionResponse {
  return emissionResponseSchema.safeParse(data).success;
}

export function isEmissionBody(data: unknown): data is EmissionBody {
  return emissionBodySchema.safeParse(data).success;
}

