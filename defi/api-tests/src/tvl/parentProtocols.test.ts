import { z } from 'zod';
import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { chainTvlSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';

const childProtocolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  chains: z.array(z.string()),
  category: z.string().optional(),
  tvl: z.number().finite().nullable(),
  chainTvls: chainTvlSchema,
  mcap: z.number().finite().nullable().optional(),
  deprecated: z.boolean().optional(),
});

const parentProtocolSchema = z.object({
  id: z.string().min(1).startsWith('parent#'),
  name: z.string().min(1),
  url: z.string(),
  description: z.string(),
  logo: z.string(),
  gecko_id: z.string().nullable(),
  cmcId: z.string().nullable(),
  twitter: z.string().nullable(),
  chains: z.array(z.string()),
  tvl: z.number().finite(),
  chainTvls: chainTvlSchema,
  mcap: z.number().finite().nullable(),
  childProtocols: z.array(childProtocolSchema).min(1),
});

type ParentProtocol = z.infer<typeof parentProtocolSchema>;

const apiClient = createApiClient(endpoints.TVL.BASE_URL);

describe('TVL API - Parent Protocols', () => {
  let res: ApiResponse<ParentProtocol[]>;

  beforeAll(async () => {
    res = await apiClient.get<ParentProtocol[]>(endpoints.TVL.PARENT_PROTOCOLS);
  });

  describe('Basic Response Validation', () => {
    it('returns successful, non-empty array', () => {
      expectSuccessfulResponse(res);
      expectArrayResponse(res);
      expectNonEmptyArray(res.data);
    });

    it('every entry validates against the parent-protocol schema', () => {
      const errors: string[] = [];
      const invalid: any[] = [];

      res.data.forEach((p, idx) => {
        const r = validate(p, parentProtocolSchema, `ParentProtocol[${idx}]`);
        if (!r.success) {
          invalid.push(p);
          errors.push(...r.errors);
        }
      });

      if (invalid.length > 0) {
        console.error(`\nFound ${invalid.length} invalid parent protocols`);
        console.error('Sample invalid:', invalid.slice(0, 3).map((p) => ({
          id: p.id || 'missing',
          name: p.name || 'unknown',
        })));
        console.error(`First 10 errors:\n${errors.slice(0, 10).join('\n')}`);
      }

      expect(invalid.length).toBe(0);
    });

    it('parent ids are unique and prefixed with parent#', () => {
      const ids = new Set<string>();
      res.data.forEach((p) => {
        expect(p.id.startsWith('parent#')).toBe(true);
        if (ids.has(p.id)) {
          throw new Error(`Duplicate parent id ${p.id}`);
        }
        ids.add(p.id);
      });
    });
  });

  describe('Aggregation invariants', () => {
    it('parent tvl approximately equals sum of child tvls (1% drift)', () => {
      res.data.slice(0, 50).forEach((p) => {
        const childSum = p.childProtocols.reduce((s, c) => s + (c.tvl ?? 0), 0);
        if (childSum === 0) return;
        const drift = Math.abs(p.tvl - childSum) / childSum;
        expect(drift).toBeLessThanOrEqual(0.01);
      });
    });

    it('parent chains is a superset of every child chain', () => {
      res.data.slice(0, 50).forEach((p) => {
        const parentChains = new Set(p.chains);
        p.childProtocols.forEach((c) => {
          c.chains.forEach((chain) => {
            expect(parentChains.has(chain)).toBe(true);
          });
        });
      });
    });

    it('parent chainTvls keys are non-empty and values non-negative', () => {
      res.data.slice(0, 20).forEach((p) => {
        Object.entries(p.chainTvls).forEach(([chain, tvl]) => {
          expectNonEmptyString(chain);
          expectValidNumber(tvl);
          expectNonNegativeNumber(tvl);
        });
      });
    });
  });

  describe('Sample lookups', () => {
    it('Aave parent exists and has at least 2 child protocols', () => {
      const aave = res.data.find((p) => p.name === 'Aave');
      expect(aave).toBeDefined();
      expect(aave!.childProtocols.length).toBeGreaterThanOrEqual(2);
    });
  });
});
