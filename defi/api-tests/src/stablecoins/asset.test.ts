import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { StablecoinAsset, isStablecoinAsset } from './types';

const apiClient = createApiClient(endpoints.STABLECOINS.BASE_URL);
import { stablecoinAssetSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

describe('Stablecoins API - Asset', () => {
  // Configure test assets - keep just one for speed, add more for thoroughness
  const testAssets = ['1'];
  const assetResponses: Record<string, ApiResponse<StablecoinAsset>> = {};

  beforeAll(async () => {
    await Promise.all(
      testAssets.map(async (asset) => {
        const endpoint = endpoints.STABLECOINS.ASSET(asset);
        if (endpoint && endpoint !== '') {
          assetResponses[asset] = await apiClient.get<StablecoinAsset>(endpoint);
        }
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testAssets.forEach((asset) => {
      describe(`Asset: ${asset}`, () => {
        it('should return successful response with valid structure', () => {
          const response = assetResponses[asset];
          
          expectSuccessfulResponse(response);
          expectObjectResponse(response);
          expect(isStablecoinAsset(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = assetResponses[asset];
          
          const result = validate(response.data, stablecoinAssetSchema, `StablecoinAsset-${asset}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors (first 5):', result.errors.slice(0, 5));
          }
        });

        it('should have required fields', () => {
          const response = assetResponses[asset];
          
          // Asset endpoint returns chainBalances/currentChainBalances, not chains array
          const requiredFields = ['id', 'name', 'symbol'];
          requiredFields.forEach((field) => {
            expect(response.data).toHaveProperty(field);
          });
        });

        it('should have valid identifiers', () => {
          const response = assetResponses[asset];
          
          expectNonEmptyString(response.data.id);
          expectNonEmptyString(response.data.name);
          expectNonEmptyString(response.data.symbol);
          // Verify ID matches what we requested
          expect(response.data.id).toBe(asset);
        });

        it('should have valid chain balances', () => {
          const response = assetResponses[asset];
          
          // Asset endpoint returns chainBalances as an object, not an array
          if (response.data.chainBalances) {
            expect(typeof response.data.chainBalances).toBe('object');
            const chains = Object.keys(response.data.chainBalances);
            expect(chains.length).toBeGreaterThan(0);
            chains.forEach((chain) => {
              expectNonEmptyString(chain);
            });
          }
          
          if (response.data.currentChainBalances) {
            expect(typeof response.data.currentChainBalances).toBe('object');
          }
        });
      });
    });
  });

  describe('Historical Chain Data', () => {
    testAssets.forEach((asset) => {
      describe(`Asset: ${asset}`, () => {
        it('should have valid historical chain data if present', () => {
          const response = assetResponses[asset];
          
          if (response.data.historicalChainData) {
            Object.entries(response.data.historicalChainData).forEach(([chain, data]) => {
              expectNonEmptyString(chain);
              expect(Array.isArray(data)).toBe(true);

              if (data.length > 0) {
                // Sample-based testing - validate first 10 points
                data.slice(0, 10).forEach((point) => {
                  expectValidTimestamp(point.date);
                  expectValidNumber(point.circulating);
                  expectNonNegativeNumber(point.circulating);
                });
              }
            });
          }
        });

        it('should have historical data in chronological order', () => {
          const response = assetResponses[asset];
          
          if (response.data.historicalChainData) {
            Object.values(response.data.historicalChainData).forEach((data) => {
              if (data.length > 1) {
                const dates = data.map((p) => p.date);
                const sortedDates = [...dates].sort((a, b) => a - b);
                expect(dates).toEqual(sortedDates);
              }
            });
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent asset gracefully', async () => {
      const endpoint = endpoints.STABLECOINS.ASSET('NONEXISTENTASSETXYZ123');
      
      const response = await apiClient.get<StablecoinAsset>(endpoint);
      // API might return 200 with null data or 4xx status
      if (response.status === 200) {
        // Null data is acceptable for non-existent asset
        expect(response.data === null || typeof response.data === 'object').toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle asset with optional market cap', () => {
      const response = assetResponses[testAssets[0]];

      // marketCap is optional and may be null or undefined
      if (response.data.marketCap === null || response.data.marketCap === undefined) {
        expect(response.data.marketCap === null || response.data.marketCap === undefined).toBe(true);
      } else {
        // Market cap should be a valid number if present
        expectValidNumber(response.data.marketCap);
        expectNonNegativeNumber(response.data.marketCap);
      }
    });

    it('should handle asset with chain balances', () => {
      const response = assetResponses[testAssets[0]];

      // Asset endpoint returns chainBalances as an object
      if (response.data.chainBalances) {
        expect(typeof response.data.chainBalances).toBe('object');
        const chains = Object.keys(response.data.chainBalances);
        // Most stablecoins should have at least one chain
        if (chains.length > 0) {
          chains.forEach((chain) => {
            expectNonEmptyString(chain);
          });
        }
      }
    });
  });

  describe('Static Metadata Validation', () => {
    it('should have correct static metadata for USDT (Tether) (id:1)', () => {
      const response = assetResponses['1'];

      // These fields never change for USDT (id:11)
      expect(response.data.id).toBe('1');
      expect(response.data.name).toBe('Tether');
      expect(response.data.symbol).toBe('USDT');
      
      // Optional but consistent fields
      if (response.data.address) {
        expect(response.data.address).toBe('0xdac17f958d2ee523a2206206994597c13d831ec7');
      }
      
      if (response.data.gecko_id) {
        expect(response.data.gecko_id).toBe('tether');
      }
      
      if (response.data.cmcId) {
        expect(response.data.cmcId).toBe('825');
      }
      
      if (response.data.pegType) {
        expect(response.data.pegType).toBe('peggedUSD');
      }
      
      if (response.data.pegMechanism) {
        expect(response.data.pegMechanism).toBe('fiat-backed');
      }
      
      if (response.data.url) {
        expect(response.data.url).toBe('https://tether.to/');
      }
      
      if (response.data.twitter) {
        expect(response.data.twitter).toBe('https://twitter.com/Tether_to');
      }
    });
  });
});

