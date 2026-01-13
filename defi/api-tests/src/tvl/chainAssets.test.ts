import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChainAssets, isChainAssets } from './types';
import { chainAssetsSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectValidNumber,
  expectValidTimestamp,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Chain Assets', () => {
  let chainAssetsResponse: ApiResponse<ChainAssets>;
  let chainKeys: string[];

  beforeAll(async () => {
    chainAssetsResponse = await apiClient.get<ChainAssets>(TVL_ENDPOINTS.CHAIN_ASSETS);
    // Extract chain keys once (filter out metadata fields)
    chainKeys = Object.keys(chainAssetsResponse.data).filter(key => key !== 'timestamp');
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(chainAssetsResponse);
      expectObjectResponse(chainAssetsResponse);
      expect(isChainAssets(chainAssetsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(chainAssetsResponse.data, chainAssetsSchema, 'ChainAssets');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
    });

    it('should have timestamp field', () => {
      expect(chainAssetsResponse.data).toHaveProperty('timestamp');
      expectValidTimestamp(chainAssetsResponse.data.timestamp);
    });

    it('should have chain data', () => {
      expect(chainKeys.length).toBeGreaterThan(0);
      expect(chainKeys.length).toBeGreaterThan(10); // Should have multiple chains
    });
  });

  describe('Chain Assets Data Validation', () => {
    it('should have valid chain asset structures', () => {
      // Sample-based testing - test first 5 chains
      chainKeys.slice(0, 5).forEach((chainName) => {
        expectNonEmptyString(chainName);
        const chainData = chainAssetsResponse.data[chainName];
        expect(typeof chainData).toBe('object');
        expect(chainData).not.toBeNull();

        // Validate each section in the chain data
        Object.entries(chainData).forEach(([section, sectionData]) => {
          expectNonEmptyString(section);
          expect(sectionData).toHaveProperty('total');
          expect(sectionData).toHaveProperty('breakdown');
          expect(typeof sectionData.total).toBe('string');
          expect(typeof sectionData.breakdown).toBe('object');
        });
      });
    });

    it('should have valid total values', () => {
      // Sample-based testing - test first 5 chains
      chainKeys.slice(0, 5).forEach((chainName) => {
        const chainData = chainAssetsResponse.data[chainName];
        Object.values(chainData).forEach((sectionData) => {
          const total = parseFloat(sectionData.total);
          expect(isNaN(total)).toBe(false);
          expect(total).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should have valid breakdown structures', () => {
      // Sample-based testing - test first 3 chains for detailed breakdown
      chainKeys.slice(0, 3).forEach((chainName) => {
        const chainData = chainAssetsResponse.data[chainName];
        Object.values(chainData).forEach((sectionData) => {
          Object.entries(sectionData.breakdown).forEach(([token, amount]) => {
            expectNonEmptyString(token);
            expectNonEmptyString(amount);
            const amountNum = parseFloat(amount);
            expect(isNaN(amountNum)).toBe(false);
            expect(amountNum).toBeGreaterThanOrEqual(0);
          });
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle chains with empty or valid breakdowns', () => {
      // Verify all chains have proper breakdown structure
      chainKeys.forEach((chainName) => {
        const chainData = chainAssetsResponse.data[chainName];
        Object.values(chainData).forEach((sectionData) => {
          expect(typeof sectionData.breakdown).toBe('object');
          expect(sectionData.breakdown).not.toBeNull();
        });
      });
    });

    it('should have reasonable timestamp', () => {
      const timestamp = chainAssetsResponse.data.timestamp;
      expect(timestamp).toBeGreaterThan(1262304000); // After Jan 1, 2010
      expect(timestamp).toBeLessThan(Date.now() / 1000 + 86400); // Not more than 1 day in future
    });
  });
});

