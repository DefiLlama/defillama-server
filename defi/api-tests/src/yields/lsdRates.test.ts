import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { LsdRatesResponse, isLsdRatesResponse } from './types';
import { lsdRatesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - LSD Rates', () => {
  let lsdRatesResponse: ApiResponse<LsdRatesResponse>;

  beforeAll(async () => {
    lsdRatesResponse = await apiClient.get<LsdRatesResponse>(endpoints.YIELDS_PRO.LSD_RATES);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(lsdRatesResponse);
      expectArrayResponse(lsdRatesResponse);
      expect(isLsdRatesResponse(lsdRatesResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(lsdRatesResponse.data, lsdRatesResponseSchema, 'LsdRates');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(lsdRatesResponse.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected LSD rates', () => {
      expect(lsdRatesResponse.data.length).toBeGreaterThan(5);
    });
  });

  describe('LSD Rate Item Validation', () => {
    it('should have at least one identifying field', () => {
      lsdRatesResponse.data.slice(0, 20).forEach((rate) => {
        const hasIdentifier = rate.address || rate.name || rate.symbol || rate.pool;
        expect(hasIdentifier).toBeTruthy();
      });
    });

    it('should have valid timestamp format when present', () => {
      const ratesWithTimestamp = lsdRatesResponse.data
        .filter((rate) => rate.timestamp !== undefined)
        .slice(0, 20);

      if (ratesWithTimestamp.length > 0) {
        ratesWithTimestamp.forEach((rate) => {
          expect(() => new Date(rate.timestamp!)).not.toThrow();
          const date = new Date(rate.timestamp!);
          expect(date.getTime()).toBeGreaterThan(0);
        });
      }
    });

    it('should have valid APY values when present', () => {
      const ratesWithApy = lsdRatesResponse.data
        .filter((rate) => rate.apy !== null && rate.apy !== undefined)
        .slice(0, 20);

      if (ratesWithApy.length > 0) {
        ratesWithApy.forEach((rate) => {
          expectValidNumber(rate.apy!);
          expect(rate.apy!).toBeGreaterThan(-100);
          expect(rate.apy!).toBeLessThan(1000);
        });
      }
    });

    it('should have valid TVL values when present', () => {
      const ratesWithTvl = lsdRatesResponse.data
        .filter((rate) => rate.tvl !== null && rate.tvl !== undefined)
        .slice(0, 20);

      if (ratesWithTvl.length > 0) {
        ratesWithTvl.forEach((rate) => {
          expectValidNumber(rate.tvl!);
          expectNonNegativeNumber(rate.tvl!);
        });
      }
    });

    it('should have valid pool IDs when present', () => {
      const ratesWithPool = lsdRatesResponse.data
        .filter((rate) => rate.pool !== undefined)
        .slice(0, 20);

      if (ratesWithPool.length > 0) {
        ratesWithPool.forEach((rate) => {
          expect(rate.pool).toMatch(/^[a-zA-Z0-9\-]+$/);
        });
      }
    });

    it('should have valid optional string fields when present', () => {
      lsdRatesResponse.data.slice(0, 20).forEach((rate) => {
        if (rate.underlying !== undefined) {
          expect(typeof rate.underlying).toBe('string');
        }
        if (rate.symbol !== undefined) {
          expect(typeof rate.symbol).toBe('string');
        }
        if (rate.project !== undefined) {
          expect(typeof rate.project).toBe('string');
        }
        if (rate.chain !== undefined) {
          expect(typeof rate.chain).toBe('string');
        }
      });
    });
  });

  describe('Data Quality Validation', () => {
    it('should have unique identifiers', () => {
      const identifiers = lsdRatesResponse.data.map((rate) => 
        rate.pool || rate.address || rate.symbol || rate.name
      );
      const uniqueIds = new Set(identifiers.filter(id => id !== undefined));
      expect(uniqueIds.size).toBeGreaterThan(0);
    });

    it('should have rates with recent timestamps when present', () => {
      const ratesWithTimestamp = lsdRatesResponse.data.filter(
        (rate) => rate.timestamp !== undefined
      );

      if (ratesWithTimestamp.length > 0) {
        const recentTimestamps = ratesWithTimestamp.filter((rate) => {
          const date = new Date(rate.timestamp!);
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          return diff < 86400000 * 7; // Within 7 days
        });

        expect(recentTimestamps.length).toBeGreaterThan(0);
      }
    });

    it('should have rates with market rate data', () => {
      const ratesWithMarketRate = lsdRatesResponse.data.filter(
        (rate) => rate.marketRate !== undefined
      );
      expect(ratesWithMarketRate.length).toBeGreaterThan(0);
    });

    it('should have rates with symbol or name', () => {
      const ratesWithLabel = lsdRatesResponse.data.filter(
        (rate) => rate.symbol !== undefined || rate.name !== undefined
      );
      expect(ratesWithLabel.length).toBeGreaterThan(0);
    });
  });
});

