import { z } from 'zod';
import {
  etfSnapshotSchema,
  etfSnapshotResponseSchema,
  etfFlowSchema,
  etfFlowsResponseSchema,
} from './schemas';

// Inferred types
export type ETFSnapshot = z.infer<typeof etfSnapshotSchema>;
export type ETFSnapshotResponse = z.infer<typeof etfSnapshotResponseSchema>;
export type ETFFlow = z.infer<typeof etfFlowSchema>;
export type ETFFlowsResponse = z.infer<typeof etfFlowsResponseSchema>;

// Type guards
export function isETFSnapshotResponse(data: any): data is ETFSnapshotResponse {
  return Array.isArray(data) && data.length > 0 && 'ticker' in data[0];
}

export function isETFFlowsResponse(data: any): data is ETFFlowsResponse {
  return Array.isArray(data) && data.length > 0 && 'gecko_id' in data[0];
}

