import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';

const apiClient = createApiClient(endpoints.STABLECOINS.BASE_URL);
import { StablecoinsListResponse, Stablecoin, isStablecoinsListResponse } from './types';
import { stablecoinsListResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

describe('Stablecoins API - List', () => {
  let stablecoinsResponse: ApiResponse<StablecoinsListResponse>;

  beforeAll(async () => {
    const endpoint = endpoints.STABLECOINS.LIST;
    // Skip if endpoint is not available (free-only API not configured)
    if (endpoint && endpoint !== '') {
      stablecoinsResponse = await apiClient.get<StablecoinsListResponse>(endpoint);
    }
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(stablecoinsResponse);
      expectObjectResponse(stablecoinsResponse);
      expect(isStablecoinsListResponse(stablecoinsResponse.data)).toBe(true);
      expect(Array.isArray(stablecoinsResponse.data.peggedAssets)).toBe(true);
      expectNonEmptyArray(stablecoinsResponse.data.peggedAssets);
    });

    it('should validate against Zod schema', () => {
      const result = validate(stablecoinsResponse.data, stablecoinsListResponseSchema, 'Stablecoins');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have required fields in all stablecoins', () => {
      const requiredFields = ['id', 'name', 'symbol', 'chains'];
      // Sample-based testing - validate first 10 stablecoins
      stablecoinsResponse.data.peggedAssets.slice(0, 10).forEach((stablecoin) => {
        requiredFields.forEach((field) => {
          expect(stablecoin).toHaveProperty(field);
        });
      });
    });

    it('should have unique identifiers', () => {
      const ids = stablecoinsResponse.data.peggedAssets.map((s) => s.id);
      // IDs should be unique
      expect(new Set(ids).size).toBe(ids.length);
      
      // Note: Symbols are NOT unique - multiple stablecoins can share the same symbol
      // For example, multiple USDT variants, bridged tokens, etc.
      const symbols = stablecoinsResponse.data.peggedAssets.map((s) => s.symbol);
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('Stablecoin Data Validation', () => {
    it('should have valid stablecoin properties', () => {
      // Sample-based testing - validate first 10 stablecoins
      stablecoinsResponse.data.peggedAssets.slice(0, 10).forEach((stablecoin) => {
        expectNonEmptyString(stablecoin.id);
        expectNonEmptyString(stablecoin.name);
        expectNonEmptyString(stablecoin.symbol);
        expect(Array.isArray(stablecoin.chains)).toBe(true);
        expect(stablecoin.chains.length).toBeGreaterThan(0);

        stablecoin.chains.forEach((chain) => {
          expectNonEmptyString(chain);
        });
      });
    });

    it('should have valid market cap values when present', () => {
      const withMarketCap = stablecoinsResponse.data.peggedAssets.filter(
        (s) => s.marketCap !== null && s.marketCap !== undefined
      );
      
      if (withMarketCap.length > 0) {
        // Sample-based testing - validate first 10 stablecoins with market cap
        withMarketCap.slice(0, 10).forEach((stablecoin) => {
          expectValidNumber(stablecoin.marketCap!);
          expectNonNegativeNumber(stablecoin.marketCap!);
        });
      }
    });

    it('should have valid price values when present', () => {
      const withPrice = stablecoinsResponse.data.peggedAssets.filter(
        (s) => s.price !== null && s.price !== undefined
      );
      
      if (withPrice.length > 0) {
        // Sample-based testing - validate first 10 stablecoins with price
        withPrice.slice(0, 10).forEach((stablecoin) => {
          expectValidNumber(stablecoin.price!);
          expectNonNegativeNumber(stablecoin.price!);
        });
      }
    });

    it('should have valid circulating amounts when present', () => {
      const withCirculating = stablecoinsResponse.data.peggedAssets.filter(
        (s) => s.circulating && Object.keys(s.circulating).length > 0
      );
      
      if (withCirculating.length > 0) {
        // Sample-based testing - validate first 5 stablecoins with circulating data
        withCirculating.slice(0, 5).forEach((stablecoin) => {
          Object.entries(stablecoin.circulating!).forEach(([chain, amount]) => {
            expectNonEmptyString(chain);
            expectValidNumber(amount);
            expectNonNegativeNumber(amount);
          });
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle stablecoins with null market cap', () => {
      const nullMarketCap = stablecoinsResponse.data.peggedAssets.filter((s) => s.marketCap === null);
      nullMarketCap.forEach((stablecoin) => {
        expect(stablecoin.marketCap).toBeNull();
        expectNonEmptyString(stablecoin.name);
      });
    });

    it('should handle stablecoins with empty chains array', () => {
      const emptyChains = stablecoinsResponse.data.peggedAssets.filter((s) => s.chains.length === 0);
      if (emptyChains.length > 0) {
        emptyChains.forEach((stablecoin) => {
          expect(Array.isArray(stablecoin.chains)).toBe(true);
        });
      }
    });

    it('should have valid optional metadata fields', () => {
      // Sample-based testing - validate first 10 stablecoins
      stablecoinsResponse.data.peggedAssets.slice(0, 10).forEach((stablecoin) => {
        if (stablecoin.url) {
          expect(stablecoin.url).toMatch(/^https?:\/\//);
        }

        if (stablecoin.twitter) {
          expect(typeof stablecoin.twitter).toBe('string');
        }

        if (stablecoin.audit_links) {
          expect(Array.isArray(stablecoin.audit_links)).toBe(true);
          stablecoin.audit_links.forEach((link) => {
            expectNonEmptyString(link);
          });
        }
      });
    });
  });
});

