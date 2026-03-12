import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { StablecoinChains, StablecoinChain, isStablecoinChains } from './types';

const apiClient = createApiClient(endpoints.STABLECOINS.BASE_URL);
import { stablecoinChainsArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

describe('Stablecoins API - Chains', () => {
  let chainsResponse: ApiResponse<StablecoinChains>;

  beforeAll(async () => {
    const endpoint = endpoints.STABLECOINS.CHAINS;
    // Skip if endpoint is not available (free-only API not configured)
    if (endpoint && endpoint !== '') {
      chainsResponse = await apiClient.get<StablecoinChains>(endpoint);
    }
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(chainsResponse);
      expectArrayResponse(chainsResponse);
      expectNonEmptyArray(chainsResponse.data);
      expect(isStablecoinChains(chainsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(chainsResponse.data, stablecoinChainsArraySchema, 'StablecoinChains');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have required fields in all chains', () => {
      // Only name is required, tvl and tokens are optional
      const requiredFields = ['name'];
      // Sample-based testing - validate first 10 chains
      chainsResponse.data.slice(0, 10).forEach((chain) => {
        requiredFields.forEach((field) => {
          expect(chain).toHaveProperty(field);
        });
      });
    });

    it('should have unique chain names', () => {
      const chainNames = chainsResponse.data.map((c) => c.name);
      expect(new Set(chainNames).size).toBe(chainNames.length);
    });
  });

  describe('Chain Data Validation', () => {
    it('should have valid chain properties', () => {
      // Sample-based testing - validate first 10 chains
      chainsResponse.data.slice(0, 10).forEach((chain) => {
        expectNonEmptyString(chain.name);
        
        // TVL and tokens are optional fields
        if (chain.tvl !== undefined) {
          expectValidNumber(chain.tvl);
          expectNonNegativeNumber(chain.tvl);
        }
        if (chain.tokens !== undefined) {
          expectValidNumber(chain.tokens);
          expectNonNegativeNumber(chain.tokens);
          expect(Number.isInteger(chain.tokens)).toBe(true);
        }
      });
    });

    it('should have valid TVL values', () => {
      const chainsWithTvl = chainsResponse.data.filter((c) => c.tvl !== undefined && c.tvl > 0);
      
      // Only test if there are chains with TVL data
      if (chainsWithTvl.length > 0) {
        // Sample-based testing - validate first 10 chains with TVL
        chainsWithTvl.slice(0, 10).forEach((chain) => {
          expectValidNumber(chain.tvl!);
          expectNonNegativeNumber(chain.tvl!);
          expect(chain.tvl!).toBeLessThan(10_000_000_000_000);
        });
      }
    });

    it('should have valid percentage changes when present', () => {
      const chainsWithChanges = chainsResponse.data.filter(
        (c) => c.change_1d !== null || c.change_7d !== null || c.change_30d !== null
      );
      
      if (chainsWithChanges.length > 0) {
        // Sample-based testing - validate first 10 chains with changes
        chainsWithChanges.slice(0, 10).forEach((chain) => {
          if (chain.change_1d !== null && chain.change_1d !== undefined) {
            expectValidNumber(chain.change_1d);
          }
          if (chain.change_7d !== null && chain.change_7d !== undefined) {
            expectValidNumber(chain.change_7d);
          }
          if (chain.change_30d !== null && chain.change_30d !== undefined) {
            expectValidNumber(chain.change_30d);
          }
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle chains with zero TVL', () => {
      const zeroTvl = chainsResponse.data.filter((c) => c.tvl === 0);
      zeroTvl.forEach((chain) => {
        expect(chain.tvl).toBe(0);
        expectNonEmptyString(chain.name);
      });
    });

    it('should handle chains with zero tokens', () => {
      const zeroTokens = chainsResponse.data.filter((c) => c.tokens === 0);
      zeroTokens.forEach((chain) => {
        expect(chain.tokens).toBe(0);
        expectNonEmptyString(chain.name);
      });
    });

    it('should handle chains with null percentage changes', () => {
      const nullChanges = chainsResponse.data.filter(
        (c) => c.change_1d === null || c.change_7d === null || c.change_30d === null
      );
      
      if (nullChanges.length > 0) {
        // Sample-based testing - validate first 5 chains with null changes
        nullChanges.slice(0, 5).forEach((chain) => {
          expectNonEmptyString(chain.name);
          expectValidNumber(chain.tvl);
        });
      }
    });
  });
});
