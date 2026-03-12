import { z } from 'zod';
import {
  activeUserItemSchema,
  activeUsersResponseSchema,
  userDataPointSchema,
  userDataArraySchema,
} from './schemas';

// ============================================================================
// Active Users Types
// ============================================================================

export type ActiveUserItem = z.infer<typeof activeUserItemSchema>;
export type ActiveUsersResponse = z.infer<typeof activeUsersResponseSchema>;

export function isActiveUsersResponse(data: unknown): data is ActiveUsersResponse {
  return activeUsersResponseSchema.safeParse(data).success;
}

// ============================================================================
// User Data Types
// ============================================================================

// UserDataPoint is a tuple: [timestamp, value]
export type UserDataPoint = z.infer<typeof userDataPointSchema>;
export type UserDataArray = z.infer<typeof userDataArraySchema>;

export function isUserDataArray(data: unknown): data is UserDataArray {
  return userDataArraySchema.safeParse(data).success;
}

