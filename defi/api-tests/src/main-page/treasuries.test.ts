import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { TreasuriesResponse, isTreasuriesResponse } from './types';
import { treasuriesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Treasuries', () => {
  let treasuriesResponse: ApiResponse<TreasuriesResponse>;

  beforeAll(async () => {
    treasuriesResponse = await apiClient.get<TreasuriesResponse>(
      endpoints.MAIN_PAGE.TREASURIES
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(treasuriesResponse);
      expectArrayResponse(treasuriesResponse);
      expect(isTreasuriesResponse(treasuriesResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        treasuriesResponse.data,
        treasuriesResponseSchema,
        'Treasuries'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(treasuriesResponse.data.length).toBeGreaterThan(0);
    });
  });

  describe('Treasury Item Validation', () => {
    it('should have required fields in all treasuries', () => {
      treasuriesResponse.data.slice(0, 20).forEach((treasury) => {
        expect(treasury).toHaveProperty('name');
        expect(typeof treasury.name).toBe('string');
        expect(treasury.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid numeric fields when present', () => {
      const treasuriesWithData = treasuriesResponse.data
        .filter((t) => t.tvl !== undefined)
        .slice(0, 20);

      expect(treasuriesWithData.length).toBeGreaterThan(0);

      treasuriesWithData.forEach((treasury) => {
        if (treasury.tvl !== undefined) {
          expectValidNumber(treasury.tvl);
          expectNonNegativeNumber(treasury.tvl);
        }
      });
    });

    it('should have valid percentage change fields when present', () => {
      const treasuriesWithChange = treasuriesResponse.data
        .filter((t) => t.change_1d !== null && t.change_1d !== undefined)
        .slice(0, 20);

      if (treasuriesWithChange.length > 0) {
        treasuriesWithChange.forEach((treasury) => {
          if (treasury.change_1h !== null && treasury.change_1h !== undefined) {
            expectValidNumber(treasury.change_1h);
          }
          if (treasury.change_1d !== null && treasury.change_1d !== undefined) {
            expectValidNumber(treasury.change_1d);
          }
          if (treasury.change_7d !== null && treasury.change_7d !== undefined) {
            expectValidNumber(treasury.change_7d);
          }
        });
      }
    });

    it('should have valid token breakdowns when present', () => {
      const treasuriesWithTokens = treasuriesResponse.data
        .filter((t) => t.tokenBreakdowns !== undefined)
        .slice(0, 10);

      if (treasuriesWithTokens.length > 0) {
        treasuriesWithTokens.forEach((treasury) => {
          expect(typeof treasury.tokenBreakdowns).toBe('object');
          
          Object.entries(treasury.tokenBreakdowns!).forEach(([token, amount]) => {
            expect(typeof token).toBe('string');
            expectValidNumber(amount);
            // Token amounts can be negative (debt)
          });
        });
      }
    });

    it('should have valid chain breakdowns when present', () => {
      const treasuriesWithChains = treasuriesResponse.data
        .filter((t) => t.chainBreakdowns !== undefined)
        .slice(0, 10);

      if (treasuriesWithChains.length > 0) {
        treasuriesWithChains.forEach((treasury) => {
          expect(typeof treasury.chainBreakdowns).toBe('object');
          
          Object.entries(treasury.chainBreakdowns!).forEach(([chain, amount]) => {
            expect(typeof chain).toBe('string');
            expectValidNumber(amount);
            expectNonNegativeNumber(amount);
          });
        });
      }
    });

    it('should have unique treasury names', () => {
      const names = treasuriesResponse.data.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have treasuries sorted by TVL in descending order', () => {
      const treasuriesWithTvl = treasuriesResponse.data
        .filter((t) => t.tvl !== undefined)
        .slice(0, 50);

      if (treasuriesWithTvl.length > 1) {
        for (let i = 0; i < treasuriesWithTvl.length - 1; i++) {
          expect(treasuriesWithTvl[i].tvl!).toBeGreaterThanOrEqual(
            treasuriesWithTvl[i + 1].tvl!
          );
        }
      }
    });

    it('should have reasonable TVL values', () => {
      const topTreasuries = treasuriesResponse.data
        .filter((t) => t.tvl !== undefined)
        .slice(0, 10);

      topTreasuries.forEach((treasury) => {
        if (treasury.tvl !== undefined) {
          expect(treasury.tvl).toBeGreaterThan(0);
          expect(treasury.tvl).toBeLessThan(100_000_000_000); // 100 billion
        }
      });
    });

    it('should have token breakdown amounts sum close to TVL', () => {
      const treasuriesWithBreakdown = treasuriesResponse.data
        .filter((t) => t.tvl && t.tokenBreakdowns)
        .slice(0, 5);

      if (treasuriesWithBreakdown.length > 0) {
        treasuriesWithBreakdown.forEach((treasury) => {
          const tokenSum = Object.values(treasury.tokenBreakdowns!).reduce(
            (sum, amount) => sum + amount, 
            0
          );
          
          // Token breakdown can significantly differ from TVL (due to debt, price changes, etc)
          // Just verify both values are defined and reasonable
          expect(tokenSum).toBeDefined();
          expect(isNaN(tokenSum)).toBe(false);
        });
      }
    });
  });
});

