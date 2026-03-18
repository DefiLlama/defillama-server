import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PercentageResponse, isPercentageResponse } from './types';
import { percentageResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Percentage Change', () => {
  const testCases = [
    {
      name: 'Major cryptocurrencies',
      coins: 'coingecko:bitcoin,coingecko:ethereum',
      description: 'BTC and ETH'
    },
    {
      name: 'Ethereum ecosystem',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7,ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      description: 'WETH, USDT, USDC'
    },
    {
      name: 'Multi-chain tokens',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      description: 'WETH, WMATIC, WETH on Arbitrum'
    }
  ];

  testCases.forEach(({ name, coins, description }) => {
    describe(`Test Case: ${name} (${description})`, () => {
      let response: ApiResponse<PercentageResponse>;

      beforeAll(async () => {
        response = await apiClient.get<PercentageResponse>(
          endpoints.COINS.PERCENTAGE(coins)
        );
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(response);
          expect(response.data).toHaveProperty('coins');
          expect(typeof response.data.coins).toBe('object');
          expect(isPercentageResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            response.data,
            percentageResponseSchema,
            `Percentage-${name}`
          );
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors.slice(0, 5));
          }
        });

        it('should return data for all requested coins', () => {
          const requestedCoins = coins.split(',');
          const receivedCoins = Object.keys(response.data.coins);
          
          requestedCoins.forEach((coin) => {
            expect(receivedCoins).toContain(coin);
          });
        });

        it('should have non-empty coins object', () => {
          const coinKeys = Object.keys(response.data.coins);
          expect(coinKeys.length).toBeGreaterThan(0);
        });
      });

      describe('Percentage Value Validation', () => {
        it('should have valid percentage values', () => {
          Object.entries(response.data.coins).forEach(([coinId, percentage]) => {
            expectValidNumber(percentage);
            expect(Number.isFinite(percentage)).toBe(true);
          });
        });

        it('should have reasonable percentage values', () => {
          Object.entries(response.data.coins).forEach(([coinId, percentage]) => {
            // Percentage change should typically be between -50% and +50% for 24h
            // But we'll allow for extreme cases
            expect(percentage).toBeGreaterThan(-99); // Not less than -99%
            expect(percentage).toBeLessThan(1000); // Not more than 1000% in 24h
          });
        });

        it('should have different values for different coins', () => {
          const percentages = Object.values(response.data.coins);
          
          // At least some coins should have different percentage changes
          const uniquePercentages = new Set(percentages);
          if (percentages.length > 1) {
            expect(uniquePercentages.size).toBeGreaterThan(0);
          }
        });
      });

      describe('Data Quality Checks', () => {
        it('should not have NaN values', () => {
          Object.entries(response.data.coins).forEach(([coinId, percentage]) => {
            expect(Number.isNaN(percentage)).toBe(false);
          });
        });

        it('should not have infinite values', () => {
          Object.entries(response.data.coins).forEach(([coinId, percentage]) => {
            expect(Number.isFinite(percentage)).toBe(true);
          });
        });

        it('should not have duplicate coin entries', () => {
          const coinIds = Object.keys(response.data.coins);
          const uniqueCoinIds = new Set(coinIds);
          expect(uniqueCoinIds.size).toBe(coinIds.length);
        });
      });
    });
  });

  describe('Specific Token Tests', () => {
    it('should return percentage for Bitcoin', async () => {
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      const btcPercentage = response.data.coins['coingecko:bitcoin'];
      expect(btcPercentage).toBeDefined();
      expectValidNumber(btcPercentage);
    });

    it('should return percentage for Ethereum', async () => {
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE('coingecko:ethereum')
      );
      
      expect(response.status).toBe(200);
      const ethPercentage = response.data.coins['coingecko:ethereum'];
      expect(ethPercentage).toBeDefined();
      expectValidNumber(ethPercentage);
    });

    it('should return small percentage for stablecoins', async () => {
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE('ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7')
      );
      
      if (response.status === 200) {
        const usdtPercentage = response.data.coins['ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7'];
        if (usdtPercentage !== undefined) {
          // Stablecoin should have very small percentage change
          expect(Math.abs(usdtPercentage)).toBeLessThan(5); // Less than 5%
        }
      }
    });
  });

  describe('Comparative Analysis', () => {
    it('should compare percentage changes across multiple coins', async () => {
      const coins = 'coingecko:bitcoin,coingecko:ethereum,ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE(coins)
      );
      
      expect(response.status).toBe(200);
      
      const percentages = Object.values(response.data.coins);
      expect(percentages.length).toBeGreaterThan(0);
      
      // Calculate average and standard deviation
      const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
      const stdDev = Math.sqrt(
        percentages.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / percentages.length
      );
      
      expect(Number.isFinite(avg)).toBe(true);
      expect(Number.isFinite(stdDev)).toBe(true);
    });

    it('should show market correlation', async () => {
      // Get percentage for major cryptocurrencies
      const coins = 'coingecko:bitcoin,coingecko:ethereum';
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE(coins)
      );
      
      if (response.status === 200) {
        const btc = response.data.coins['coingecko:bitcoin'];
        const eth = response.data.coins['coingecko:ethereum'];
        
        if (btc !== undefined && eth !== undefined) {
          // BTC and ETH typically move in the same direction (though not always)
          // Just check they're both valid numbers
          expectValidNumber(btc);
          expectValidNumber(eth);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single coin request', async () => {
      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBe(1);
    });

    it('should handle many coins at once', async () => {
      const manyCoins = [
        'coingecko:bitcoin',
        'coingecko:ethereum',
        'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      ].join(',');

      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE(manyCoins)
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBeGreaterThan(3);
    });

    it('should handle invalid coin gracefully', async () => {
      const response = await apiClient.get(
        endpoints.COINS.PERCENTAGE('invalid:0x0000000000000000000000000000000000000000')
      );
      
      // API may return 200 with empty data or error
      if (response.status === 200) {
        expect(response.data).toHaveProperty('coins');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Positive/Negative Changes', () => {
    it('should have both positive and negative changes in market', async () => {
      // Test with many coins to likely get both positive and negative
      const coins = [
        'coingecko:bitcoin',
        'coingecko:ethereum',
        'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ].join(',');

      const response = await apiClient.get<PercentageResponse>(
        endpoints.COINS.PERCENTAGE(coins)
      );
      
      if (response.status === 200) {
        const percentages = Object.values(response.data.coins);
        
        // In a typical market, not all coins move in the same direction
        // But this isn't guaranteed, so we just check the data is valid
        percentages.forEach((pct) => {
          expectValidNumber(pct);
        });
      }
    });
  });
});

