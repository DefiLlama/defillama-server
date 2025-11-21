import { z } from 'zod';
import {
  bridgeListItemSchema,
  bridgesListResponseSchema,
  bridgeDetailSchema,
  transactionCountsSchema,
  chainBreakdownItemSchema,
} from './schemas';

// Inferred types
export type BridgeListItem = z.infer<typeof bridgeListItemSchema>;
export type BridgesListResponse = z.infer<typeof bridgesListResponseSchema>;
export type BridgeDetail = z.infer<typeof bridgeDetailSchema>;
export type TransactionCounts = z.infer<typeof transactionCountsSchema>;
export type ChainBreakdownItem = z.infer<typeof chainBreakdownItemSchema>;

// Type guards
export function isBridgesListResponse(data: any): data is BridgesListResponse {
  return (
    data &&
    typeof data === 'object' &&
    'bridges' in data &&
    Array.isArray(data.bridges)
  );
}

export function isBridgeDetail(data: any): data is BridgeDetail {
  return (
    data &&
    typeof data === 'object' &&
    'id' in data &&
    'name' in data &&
    'displayName' in data
  );
}

