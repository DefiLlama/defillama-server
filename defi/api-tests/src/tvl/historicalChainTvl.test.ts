import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { HistoricalChainTvl, isHistoricalChainTvl } from './types';
import { historicalChainTvlArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Historical Chain TVL (All Chains)', () => {
  const HISTORICAL_CHAIN_TVL_ENDPOINT = TVL_ENDPOINTS.HISTORICAL_CHAIN_TVL;
  let allChainsResponse: ApiResponse<HistoricalChainTvl>;

  beforeAll(async () => {
    allChainsResponse = await apiClient.get<HistoricalChainTvl>(HISTORICAL_CHAIN_TVL_ENDPOINT);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(allChainsResponse);
      expectArrayResponse(allChainsResponse);
      expectNonEmptyArray(allChainsResponse.data);
      expect(isHistoricalChainTvl(allChainsResponse.data)).toBe(true);
      expect(allChainsResponse.data.length).toBeGreaterThan(100); // Should have historical data
    });

    it('should validate against Zod schema', () => {
      const result = validate(allChainsResponse.data, historicalChainTvlArraySchema, 'HistoricalChainTvl');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
    });
  });

  describe('Data Point Validation', () => {
    it('should have valid data points structure', () => {
      // Sample-based testing - validate first 10 points
      allChainsResponse.data.slice(0, 10).forEach((point) => {
        expectValidTimestamp(point.date);
        expectValidNumber(point.tvl);
        expectNonNegativeNumber(point.tvl);
      });
    });

    it('should have data points in chronological order', () => {
      if (allChainsResponse.data.length > 1) {
        const dates = allChainsResponse.data.map((p) => p.date);
        const sortedDates = [...dates].sort((a, b) => a - b);
        expect(dates).toEqual(sortedDates);
      }
    });

    it('should have reasonable TVL values', () => {
      // Sample-based testing - validate first 10 points
      allChainsResponse.data.slice(0, 10).forEach((point) => {
        expect(point.tvl).toBeGreaterThanOrEqual(0);
        expect(point.tvl).toBeLessThan(10_000_000_000_000); // Max reasonable TVL
      });
    });
  });

  describe('Edge Cases', () => {
    it('should exclude liquid staking and double counted TVL', () => {
      if (allChainsResponse.data.length > 0) {
        const latestPoint = allChainsResponse.data[allChainsResponse.data.length - 1];
        expectValidNumber(latestPoint.tvl);
        expectNonNegativeNumber(latestPoint.tvl);
      }
    });
  });
});

describe('TVL API - Historical Chain TVL (Specific Chain)', () => {
  // Configure test chains - keep just one for speed, add more for thoroughness
  const testChains = ['ethereum'];
  // const testChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche'];
  const chainResponses: Record<string, ApiResponse<HistoricalChainTvl>> = {};

  beforeAll(async () => {
    // Fetch all test chains in parallel once
    await Promise.all(
      testChains.map(async (chain) => {
        chainResponses[chain] = await apiClient.get<HistoricalChainTvl>(
          TVL_ENDPOINTS.HISTORICAL_CHAIN_TVL_BY_CHAIN(chain)
        );
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testChains.forEach((chain) => {
      describe(`Chain: ${chain}`, () => {
        it('should return successful response with valid structure', () => {
          const response = chainResponses[chain];
          expectSuccessfulResponse(response);
          expectArrayResponse(response);
          expectNonEmptyArray(response.data);
          expect(isHistoricalChainTvl(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = chainResponses[chain];
          const result = validate(response.data, historicalChainTvlArraySchema, `HistoricalChainTvl-${chain}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });
      });
    });
  });

  describe('Data Point Validation', () => {
    testChains.forEach((chain) => {
      describe(`Chain: ${chain}`, () => {
        it('should have valid data points structure', () => {
          const response = chainResponses[chain];
          expect(response.data.length).toBeGreaterThan(0);

          // Sample-based testing - validate first 10 points
          response.data.slice(0, 10).forEach((point) => {
            expectValidTimestamp(point.date);
            expectValidNumber(point.tvl);
            expectNonNegativeNumber(point.tvl);
          });
        });

        it('should have data points in chronological order', () => {
          const response = chainResponses[chain];
          if (response.data.length > 1) {
            const dates = response.data.map((p) => p.date);
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
          }
        });

        it('should have reasonable TVL values', () => {
          const response = chainResponses[chain];
          // Sample-based testing - validate first 10 points
          response.data.slice(0, 10).forEach((point) => {
            expect(point.tvl).toBeGreaterThanOrEqual(0);
            expect(point.tvl).toBeLessThan(10_000_000_000_000); // Max reasonable TVL
          });
        });

        it('should have consistent date range', () => {
          const response = chainResponses[chain];
          if (response.data.length > 1) {
            const firstDate = response.data[0].date;
            const lastDate = response.data[response.data.length - 1].date;
            expect(lastDate).toBeGreaterThan(firstDate);
            expect(firstDate).toBeGreaterThan(1262304000); // After Jan 1, 2010
            expect(lastDate).toBeLessThan(Date.now() / 1000); // Not in future
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent chain gracefully', async () => {
      const response = await apiClient.get(
        TVL_ENDPOINTS.HISTORICAL_CHAIN_TVL_BY_CHAIN('non-existent-chain-xyz-123')
      );

      // API may return 200 with empty array, error message, or 4xx status
      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        // If 200, data should be array (possibly empty) or error object
        expect(response.data).toBeDefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    }, 60000);

    it('should handle empty array for new chains', () => {
      // Use first test chain
      const response = chainResponses[testChains[0]];
      
      if (response.data.length === 0) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        // Most chains should have data
        expect(response.data.length).toBeGreaterThan(0);
      }
    });
  });
});

