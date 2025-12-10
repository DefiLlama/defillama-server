import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PoolsResponse, isPoolsResponse } from './types';
import { poolsResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - Pools', () => {
  let poolsResponse: ApiResponse<PoolsResponse>;

  beforeAll(async () => {
    poolsResponse = await apiClient.get<PoolsResponse>(endpoints.YIELDS_PRO.POOLS);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(poolsResponse);
      expect(poolsResponse.data).toHaveProperty('status');
      expect(poolsResponse.data).toHaveProperty('data');
      expect(poolsResponse.data.status).toBe('success');
      expect(Array.isArray(poolsResponse.data.data)).toBe(true);
      expect(isPoolsResponse(poolsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(poolsResponse.data, poolsResponseSchema, 'Pools');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(poolsResponse.data.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected pools', () => {
      expect(poolsResponse.data.data.length).toBeGreaterThan(100);
    });
  });

  describe('Pool Item Validation', () => {
    it('should have required fields in all pools', () => {
      poolsResponse.data.data.slice(0, 20).forEach((pool) => {
        expect(pool).toHaveProperty('chain');
        expect(pool).toHaveProperty('project');
        expect(pool).toHaveProperty('symbol');
        expect(pool).toHaveProperty('tvlUsd');
        expect(pool).toHaveProperty('pool');

        expect(typeof pool.chain).toBe('string');
        expect(typeof pool.project).toBe('string');
        expect(typeof pool.symbol).toBe('string');
        expect(typeof pool.pool).toBe('string');
      });
    });

    it('should have valid TVL values', () => {
      poolsResponse.data.data.slice(0, 50).forEach((pool) => {
        expectValidNumber(pool.tvlUsd);
        expectNonNegativeNumber(pool.tvlUsd);
      });
    });

    it('should have valid APY values when present', () => {
      const poolsWithApy = poolsResponse.data.data
        .filter((pool) => pool.apy !== null && pool.apy !== undefined)
        .slice(0, 50);

      expect(poolsWithApy.length).toBeGreaterThan(0);

      poolsWithApy.forEach((pool) => {
        expectValidNumber(pool.apy!);
        expect(pool.apy!).toBeGreaterThan(-100);
        expect(pool.apy!).toBeLessThan(10000);
      });
    });

    it('should have valid pool IDs', () => {
      poolsResponse.data.data.slice(0, 20).forEach((pool) => {
        expect(pool.pool).toMatch(/^[a-zA-Z0-9\-]+$/);
      });
    });

    it('should have valid percentage change fields when present', () => {
      const poolsWithPct = poolsResponse.data.data
        .filter((pool) => pool.apyPct1D !== null && pool.apyPct1D !== undefined)
        .slice(0, 20);

      if (poolsWithPct.length > 0) {
        poolsWithPct.forEach((pool) => {
          if (pool.apyPct1D !== null && pool.apyPct1D !== undefined) {
            expectValidNumber(pool.apyPct1D);
          }
          if (pool.apyPct7D !== null && pool.apyPct7D !== undefined) {
            expectValidNumber(pool.apyPct7D);
          }
          if (pool.apyPct30D !== null && pool.apyPct30D !== undefined) {
            expectValidNumber(pool.apyPct30D);
          }
        });
      }
    });

    it('should have valid reward tokens array when present', () => {
      const poolsWithRewards = poolsResponse.data.data
        .filter((pool) => pool.rewardTokens !== null && pool.rewardTokens !== undefined)
        .slice(0, 20);

      if (poolsWithRewards.length > 0) {
        poolsWithRewards.forEach((pool) => {
          expect(Array.isArray(pool.rewardTokens)).toBe(true);
          if (pool.rewardTokens && pool.rewardTokens.length > 0) {
            pool.rewardTokens.forEach((token) => {
              expect(typeof token).toBe('string');
            });
          }
        });
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have pools with high TVL', () => {
      const highTvlPools = poolsResponse.data.data.filter((pool) => pool.tvlUsd > 1_000_000_000);
      expect(highTvlPools.length).toBeGreaterThan(0);
    });

    it('should have pools from multiple chains', () => {
      const chains = new Set(poolsResponse.data.data.map((pool) => pool.chain));
      expect(chains.size).toBeGreaterThan(5);
    });

    it('should have pools from multiple projects', () => {
      const projects = new Set(poolsResponse.data.data.map((pool) => pool.project));
      expect(projects.size).toBeGreaterThan(10);
    });

    it('should have unique pool IDs', () => {
      const poolIds = poolsResponse.data.data.map((pool) => pool.pool);
      const uniqueIds = new Set(poolIds);
      expect(uniqueIds.size).toBe(poolIds.length);
    });

    it('should have pools with stablecoin flag', () => {
      const stablecoinPools = poolsResponse.data.data.filter(
        (pool) => pool.stablecoin === true
      );
      expect(stablecoinPools.length).toBeGreaterThan(0);
    });

    it('should have pools sorted by TVL in descending order', () => {
      const firstTenPools = poolsResponse.data.data.slice(0, 10);
      for (let i = 0; i < firstTenPools.length - 1; i++) {
        expect(firstTenPools[i].tvlUsd).toBeGreaterThanOrEqual(firstTenPools[i + 1].tvlUsd);
      }
    });
  });
});

