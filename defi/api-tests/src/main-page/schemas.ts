import { z } from 'zod';

// Schema for categories response
// The response is an object with category names as keys and arrays of protocol names as values
export const categoriesResponseSchema = z.object({
  categories: z.record(z.string(), z.array(z.string())),
  chart: z.record(z.string(), z.record(z.string(), z.object({ tvl: z.number().optional() }).passthrough())),
});

// Individual category schema (not used for the main response, but kept for reference)
export const categorySchema = z.object({
  name: z.string(),
  protocols: z.array(z.string()),
});

// Schema for fork item
export const forkSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  protocols: z.number().optional(),
  tvl: z.number().optional(),
  forkedFrom: z.array(z.string()).optional(),
  change_1h: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
});

export const forksResponseSchema = z.object({
  forks: z.record(z.string(), z.any()), // Object with fork names as keys
  chart: z.record(z.string(), z.record(z.string(), z.object({ tvl: z.number().optional() }).passthrough())),
});

// Schema for oracle item
export const oracleSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  protocols: z.number().optional(),
  tvl: z.number().optional(),
  change_1h: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
});

export const oraclesResponseSchema = z.object({
  oracles: z.record(z.string(), z.any()), // Object with oracle names as keys
  chart: z.record(z.string(), z.any()).optional(),
  chainChart: z.record(z.string(), z.any()).optional(),
  oraclesTVS: z.any().optional(), // Can be number or object
  chainsByOracle: z.record(z.string(), z.any()).optional(),
});

// Schema for hack item
export const hackSchema = z.object({
  name: z.string(),
  date: z.union([z.number(), z.string()]),
  amount: z.number().nullable(),
  chain: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  classification: z.string().nullable().optional(),
  technique: z.string().nullable().optional(),
  bridge: z.string().nullable().optional(),
  defillamaId: z.union([z.string(), z.number()]).nullable().optional(),
});

export const hacksResponseSchema = z.array(hackSchema);

// Schema for raise item
export const raiseSchema = z.object({
  name: z.string(),
  date: z.union([z.number(), z.string()]),
  amount: z.number().nullable(),
  round: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  leadInvestors: z.array(z.string()).optional(),
  otherInvestors: z.array(z.string()).optional(),
  valuation: z.union([z.number(), z.string()]).nullable().optional(),
  defillamaId: z.string().optional(),
  chains: z.array(z.string()).optional(),
});

export const raisesResponseSchema = z.object({
  raises: z.array(raiseSchema),
});

// Schema for treasury item
export const treasurySchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  symbol: z.string().optional(),
  tvl: z.number().optional(),
  tokenBreakdowns: z.record(z.string(), z.number()).optional(),
  chainBreakdowns: z.record(z.string(), z.number()).optional(),
  change_1h: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
});

export const treasuriesResponseSchema = z.array(treasurySchema);

// Schema for entity item
export const entitySchema = z.object({
  name: z.string(),
  id: z.string().optional(),
  protocols: z.number().optional(),
  tvl: z.number().optional(),
  change_1h: z.number().nullable().optional(),
  change_1d: z.number().nullable().optional(),
  change_7d: z.number().nullable().optional(),
});

export const entitiesResponseSchema = z.array(entitySchema);

