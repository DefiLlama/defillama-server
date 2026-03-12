import { z } from 'zod';
import {
  narrativePerformancePointSchema,
  narrativePerformanceResponseSchema,
} from './schemas';

// Inferred types
export type NarrativePerformancePoint = z.infer<typeof narrativePerformancePointSchema>;
export type NarrativePerformanceResponse = z.infer<typeof narrativePerformanceResponseSchema>;

// Type guards
export function isNarrativePerformanceResponse(data: any): data is NarrativePerformanceResponse {
  return Array.isArray(data) && data.length > 0 && data.every((item) => 'date' in item);
}

export function isNarrativePerformancePoint(data: any): data is NarrativePerformancePoint {
  return data && typeof data === 'object' && 'date' in data && typeof data.date === 'number';
}

