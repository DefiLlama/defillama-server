import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChainsV2, isChainsV2, } from './types';
import { chainsV2ArraySchema } from './schemas';
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

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Chains V2', () => {
  let chainsResponse: ApiResponse<ChainsV2>;

  beforeAll(async () => {
    chainsResponse = await apiClient.get<ChainsV2>(TVL_ENDPOINTS.CHAINS_V2);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(chainsResponse);
      expectArrayResponse(chainsResponse);
      expectNonEmptyArray(chainsResponse.data);
      expect(isChainsV2(chainsResponse.data)).toBe(true);
      expect(chainsResponse.data.length).toBeGreaterThan(10); // Should have multiple chains
    });

    it('should validate against Zod schema', () => {
      const result = validate(chainsResponse.data, chainsV2ArraySchema, 'ChainsV2');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
    });

    it('should have required fields in all chains', () => {
      const requiredFields = ['name', 'tvl'];
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
        // Required fields
        expectNonEmptyString(chain.name);
        expectValidNumber(chain.tvl);
        expectNonNegativeNumber(chain.tvl);
        expect(chain.tvl).toBeLessThan(10_000_000_000_000); // Reasonable max TVL

        // Optional fields - validate if present
        if (chain.gecko_id !== null) {
          expectNonEmptyString(chain.gecko_id);
        }

        if (chain.tokenSymbol !== null) {
          expectNonEmptyString(chain.tokenSymbol);
        }

        if (chain.cmcId !== null) {
          expectNonEmptyString(chain.cmcId);
        }

        if (chain.chainId !== undefined && chain.chainId !== null) {
          expectValidNumber(chain.chainId);
          expect(chain.chainId).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid TVL values', () => {
      const chainsWithTvl = chainsResponse.data.filter((c) => c.tvl > 0);
      expect(chainsWithTvl.length).toBeGreaterThan(0);

      // Sample-based testing - validate first 10 chains with TVL
      chainsWithTvl.slice(0, 10).forEach((chain) => {
        expectValidNumber(chain.tvl);
        expectNonNegativeNumber(chain.tvl);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle chains with zero TVL', () => {
      const zeroTvlChains = chainsResponse.data.filter((c) => c.tvl === 0);
      
      // Verify zero TVL chains still have valid structure
      zeroTvlChains.forEach((chain) => {
        expect(chain.tvl).toBe(0);
        expectNonEmptyString(chain.name);
      });
    });

    it('should handle chains with null optional fields', () => {
      const chainsWithNulls = chainsResponse.data.filter(
        (c) => c.gecko_id === null || c.tokenSymbol === null || c.cmcId === null
      );
      
      // Verify chains with null optional fields still have valid required fields
      if (chainsWithNulls.length > 0) {
        // Sample-based testing - validate first 5 chains with nulls
        chainsWithNulls.slice(0, 5).forEach((chain) => {
          expectNonEmptyString(chain.name);
          expectValidNumber(chain.tvl);
          expectNonNegativeNumber(chain.tvl);
        });
      }
    });

    it('should include Ethereum chain with correct metadata', () => {
      const ethereum = chainsResponse.data.find((c) => c.name === 'Ethereum');
      
      expect(ethereum).toBeDefined();
      expect(ethereum!.gecko_id).toBe('ethereum');
      expect(ethereum!.tokenSymbol).toBe('ETH');
      expect(ethereum!.cmcId).toBe('1027');
      expect(ethereum!.name).toBe('Ethereum');
      expect(ethereum!.chainId).toBe(1);
      
      // TVL should be non-zero for Ethereum
      expectValidNumber(ethereum!.tvl);
      expect(ethereum!.tvl).toBeGreaterThan(0);
    });
  });
});

