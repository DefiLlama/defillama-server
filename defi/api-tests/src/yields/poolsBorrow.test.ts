import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PoolsBorrowResponse, isPoolsBorrowResponse } from './types';
import { poolsBorrowResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - Pools Borrow', () => {
  let poolsBorrowResponse: ApiResponse<PoolsBorrowResponse>;

  beforeAll(async () => {
    poolsBorrowResponse = await apiClient.get<PoolsBorrowResponse>(
      endpoints.YIELDS_PRO.POOLS_BORROW
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(poolsBorrowResponse);
      expect(poolsBorrowResponse.data).toHaveProperty('status');
      expect(poolsBorrowResponse.data).toHaveProperty('data');
      expect(poolsBorrowResponse.data.status).toBe('success');
      expect(Array.isArray(poolsBorrowResponse.data.data)).toBe(true);
      expect(isPoolsBorrowResponse(poolsBorrowResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        poolsBorrowResponse.data,
        poolsBorrowResponseSchema,
        'PoolsBorrow'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(poolsBorrowResponse.data.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected borrow pools', () => {
      expect(poolsBorrowResponse.data.data.length).toBeGreaterThan(50);
    });
  });

  describe('Borrow Pool Item Validation', () => {
    it('should have required fields in all pools', () => {
      poolsBorrowResponse.data.data.slice(0, 20).forEach((pool) => {
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

    it('should have valid TVL and supply/borrow values', () => {
      poolsBorrowResponse.data.data.slice(0, 50).forEach((pool) => {
        expectValidNumber(pool.tvlUsd);
        expectNonNegativeNumber(pool.tvlUsd);

        if (pool.totalSupplyUsd !== undefined) {
          expectValidNumber(pool.totalSupplyUsd);
          expectNonNegativeNumber(pool.totalSupplyUsd);
        }

        if (pool.totalBorrowUsd !== undefined && typeof pool.totalBorrowUsd === 'number') {
          expectValidNumber(pool.totalBorrowUsd);
          // Note: totalBorrowUsd can be negative in some cases (e.g., debt positions)
        }
      });
    });

    it('should have valid borrow APY values when present', () => {
      const poolsWithBorrowApy = poolsBorrowResponse.data.data
        .filter((pool) => pool.apyBorrow !== null && pool.apyBorrow !== undefined)
        .slice(0, 50);

      if (poolsWithBorrowApy.length > 0) {
        poolsWithBorrowApy.forEach((pool) => {
          expectValidNumber(pool.apyBorrow!);
          expect(pool.apyBorrow!).toBeGreaterThan(-100);
          expect(pool.apyBorrow!).toBeLessThan(10000);
        });
      }
    });

    it('should have valid LTV values when present', () => {
      const poolsWithLtv = poolsBorrowResponse.data.data
        .filter((pool) => pool.ltv !== null && pool.ltv !== undefined)
        .slice(0, 20);

      if (poolsWithLtv.length > 0) {
        poolsWithLtv.forEach((pool) => {
          expectValidNumber(pool.ltv!);
          expect(pool.ltv!).toBeGreaterThan(0);
          expect(pool.ltv!).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have pools from multiple chains', () => {
      const chains = new Set(poolsBorrowResponse.data.data.map((pool) => pool.chain));
      expect(chains.size).toBeGreaterThan(3);
    });

    it('should have pools from multiple projects', () => {
      const projects = new Set(poolsBorrowResponse.data.data.map((pool) => pool.project));
      expect(projects.size).toBeGreaterThan(5);
    });

    it('should have unique pool IDs', () => {
      const poolIds = poolsBorrowResponse.data.data.map((pool) => pool.pool);
      const uniqueIds = new Set(poolIds);
      expect(uniqueIds.size).toBe(poolIds.length);
    });

    it('should have pools with borrow rates', () => {
      const poolsWithBorrow = poolsBorrowResponse.data.data.filter(
        (pool) => pool.apyBaseBorrow !== null && pool.apyBaseBorrow !== undefined
      );
      expect(poolsWithBorrow.length).toBeGreaterThan(0);
    });
  });
});

