import { z } from 'zod';
import {
  categorySchema,
  categoriesResponseSchema,
  forkSchema,
  forksResponseSchema,
  oracleSchema,
  oraclesResponseSchema,
  hackSchema,
  hacksResponseSchema,
  raiseSchema,
  raisesResponseSchema,
  treasurySchema,
  treasuriesResponseSchema,
  entitySchema,
  entitiesResponseSchema,
} from './schemas';

// Infer types from schemas
export type Category = z.infer<typeof categorySchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
export type CategoryArray = Category[];

export type Fork = z.infer<typeof forkSchema>;
export type ForksResponse = z.infer<typeof forksResponseSchema>;

export type Oracle = z.infer<typeof oracleSchema>;
export type OraclesResponse = z.infer<typeof oraclesResponseSchema>;

export type Hack = z.infer<typeof hackSchema>;
export type HacksResponse = z.infer<typeof hacksResponseSchema>;

export type Raise = z.infer<typeof raiseSchema>;
export type RaisesResponse = z.infer<typeof raisesResponseSchema>;

export type Treasury = z.infer<typeof treasurySchema>;
export type TreasuriesResponse = z.infer<typeof treasuriesResponseSchema>;

export type Entity = z.infer<typeof entitySchema>;
export type EntitiesResponse = z.infer<typeof entitiesResponseSchema>;

// Type guards
export function isCategoriesResponse(data: unknown): data is CategoriesResponse {
  return categoriesResponseSchema.safeParse(data).success;
}

export function isForksResponse(data: unknown): data is ForksResponse {
  return forksResponseSchema.safeParse(data).success;
}

export function isOraclesResponse(data: unknown): data is OraclesResponse {
  return oraclesResponseSchema.safeParse(data).success;
}

export function isHacksResponse(data: unknown): data is HacksResponse {
  return hacksResponseSchema.safeParse(data).success;
}

export function isRaisesResponse(data: unknown): data is RaisesResponse {
  return raisesResponseSchema.safeParse(data).success;
}

export function isTreasuriesResponse(data: unknown): data is TreasuriesResponse {
  return treasuriesResponseSchema.safeParse(data).success;
}

export function isEntitiesResponse(data: unknown): data is EntitiesResponse {
  return entitiesResponseSchema.safeParse(data).success;
}

