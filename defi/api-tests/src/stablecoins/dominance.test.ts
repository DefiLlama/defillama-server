import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { StablecoinDominanceArray, isStablecoinDominanceArray } from './types';

const apiClient = createApiClient(endpoints.STABLECOINS.BASE_URL);
import { stablecoinDominanceArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

describe('Stablecoins API - Dominance', () => {
  // Configure test chains - keep just one for speed, add more for thoroughness
  const testChains = ['Ethereum'];
  // const testChains = ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Avalanche'];
  const dominanceResponses: Record<string, ApiResponse<StablecoinDominanceArray>> = {};

  beforeAll(async () => {
    // Fetch all test chains in parallel once
    await Promise.all(
      testChains.map(async (chain) => {
        const endpoint = endpoints.STABLECOINS.DOMINANCE(chain);
        dominanceResponses[chain] = await apiClient.get<StablecoinDominanceArray>(endpoint);
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testChains.forEach((chain) => {
      describe(`Chain: ${chain}`, () => {
        it('should return successful response with valid structure', () => {
          const response = dominanceResponses[chain];
          expectSuccessfulResponse(response);
          expectArrayResponse(response);
          expect(isStablecoinDominanceArray(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = dominanceResponses[chain];
          const result = validate(response.data, stablecoinDominanceArraySchema, `StablecoinDominance-${chain}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors (first 5):', result.errors.slice(0, 5));
          }
        });

        it('should have required fields in all data points', () => {
          const response = dominanceResponses[chain];
          expect(response).toBeDefined();
          
          if (response.data.length > 0) {
            const requiredFields = ['date', 'totalCirculatingUSD'];
            // Sample-based testing - validate first 10 data points
            response.data.slice(0, 10).forEach((point) => {
              requiredFields.forEach((field) => {
                expect(point).toHaveProperty(field);
              });
            });
          }
        });

        it('should have valid timestamps', () => {
          const response = dominanceResponses[chain];
          expect(response).toBeDefined();
          
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 data points
            response.data.slice(0, 10).forEach((point) => {
              // Date is a string timestamp from API, should be convertible to number
              const dateNum = typeof point.date === 'string' ? Number(point.date) : point.date;
              expect(typeof dateNum).toBe('number');
              expect(isNaN(dateNum)).toBe(false);
              expectValidTimestamp(dateNum);
            });
          }
        });

        it('should have data points in chronological order', () => {
          const response = dominanceResponses[chain];

          if (response.data.length > 1) {
            const dates = response.data.map((p) => p.date);
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
          }
        });

        it('should have fresh data (most recent timestamp within 1 day)', () => {
          const response = dominanceResponses[chain];

          if (response.data.length > 0) {
            const timestamps = response.data.map((point) => {
              // Convert string timestamp to number if needed
              return typeof point.date === 'string' ? Number(point.date) : point.date;
            });
            expectFreshData(timestamps, 86400); // 1 day in seconds
          }
        });
      });
    });
  });

  describe('Dominance Data Validation', () => {
    testChains.forEach((chain) => {
      describe(`Chain: ${chain}`, () => {
        it('should have valid total circulating USD values', () => {
          const response = dominanceResponses[chain];
          expect(response).toBeDefined();
          
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 data points
            response.data.slice(0, 10).forEach((point) => {
              // totalCirculatingUSD is an object with pegType keys
              expect(typeof point.totalCirculatingUSD).toBe('object');
              expect(point.totalCirculatingUSD).not.toBeNull();
              
              Object.entries(point.totalCirculatingUSD).forEach(([pegType, amount]) => {
                expect(typeof pegType).toBe('string');
                expect(pegType.length).toBeGreaterThan(0);
                expectValidNumber(amount);
                expectNonNegativeNumber(amount);
                expect(amount).toBeLessThan(10_000_000_000_000);
              });
            });
          }
        });

        it('should have valid greatestMcap when present', () => {
          const response = dominanceResponses[chain];
          expect(response).toBeDefined();
          
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 data points
            response.data.slice(0, 10).forEach((point) => {
              if (point.greatestMcap) {
                expect(typeof point.greatestMcap).toBe('object');
                expect(point.greatestMcap.symbol).toBeDefined();
                expect(typeof point.greatestMcap.symbol).toBe('string');
                expectValidNumber(point.greatestMcap.mcap);
                expectNonNegativeNumber(point.greatestMcap.mcap);
              }
            });
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent chain gracefully', async () => {
      const endpoint = endpoints.STABLECOINS.DOMINANCE('non-existent-chain-xyz-123');

      const response = await apiClient.get<StablecoinDominanceArray>(endpoint);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.data).toBeNull();
    });

    it('should handle empty array for new chains', () => {
      const response = dominanceResponses[testChains[0]];
      expect(response).toBeDefined();

      if (response.data.length === 0) {
        console.log('response', response);
        expect(Array.isArray(response.data)).toBe(true);
      }
    });
  });
});
