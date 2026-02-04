import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PricesCurrentResponse, isPricesCurrentResponse } from './types';
import { pricesCurrentResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Prices Current', () => {
  // Test with various coin types
  const testCases = [
    {
      name: 'Ethereum tokens',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
      description: 'WETH and USDT'
    },
    {
      name: 'CoinGecko IDs',
      coins: 'coingecko:bitcoin,coingecko:ethereum',
      description: 'BTC and ETH via CoinGecko'
    },
    {
      name: 'Mixed sources',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,coingecko:bitcoin,bsc:0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      description: 'Ethereum, Bitcoin, and BSC tokens'
    },
    {
      name: 'Polygon tokens',
      coins: 'polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      description: 'WMATIC and USDC on Polygon'
    },
    {
      name: 'Arbitrum tokens',
      coins: 'arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,arbitrum:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      description: 'WETH and USDT on Arbitrum'
    }
  ];

  testCases.forEach(({ name, coins, description }) => {
    describe(`Test Case: ${name} (${description})`, () => {
      let response: ApiResponse<PricesCurrentResponse>;

      beforeAll(async () => {
        response = await apiClient.get<PricesCurrentResponse>(
          endpoints.COINS.PRICES_CURRENT(coins)
        );
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(response);
          expect(response.data).toHaveProperty('coins');
          expect(typeof response.data.coins).toBe('object');
          expect(isPricesCurrentResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            response.data,
            pricesCurrentResponseSchema,
            `PricesCurrent-${name}`
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

      describe('Price Data Validation', () => {
        it('should have valid price values for all coins', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.price);
            expect(data.price).toBeGreaterThan(0);
          });
        });

        it('should have valid timestamps', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.timestamp);
            expectValidTimestamp(data.timestamp);
            
            // Timestamp should be recent (within last hour)
            const now = Math.floor(Date.now() / 1000);
            const age = now - data.timestamp;
            expect(age).toBeLessThan(3600);
            expect(age).toBeGreaterThanOrEqual(0);
          });
        });

        it('should have valid symbols', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expect(data.symbol).toBeDefined();
            expect(typeof data.symbol).toBe('string');
            expect(data.symbol.length).toBeGreaterThan(0);
            expect(data.symbol.length).toBeLessThan(20);
          });
        });

        it('should have valid confidence scores when present', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            if (data.confidence !== undefined) {
              expectValidNumber(data.confidence);
              expect(data.confidence).toBeGreaterThanOrEqual(0);
              expect(data.confidence).toBeLessThanOrEqual(1);
            }
          });
        });

        it('should have valid decimals for ERC20 tokens', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            if (coinId.includes('ethereum:') || coinId.includes('polygon:') || coinId.includes('arbitrum:')) {
              if (data.decimals !== undefined) {
                expectValidNumber(data.decimals);
                expect(data.decimals).toBeGreaterThanOrEqual(0);
                expect(data.decimals).toBeLessThanOrEqual(18);
              }
            }
          });
        });
      });

      describe('Data Quality Checks', () => {
        it('should have consistent timestamps across all coins', () => {
          const timestamps = Object.values(response.data.coins).map(coin => coin.timestamp);
          const uniqueTimestamps = new Set(timestamps);
          
          // All timestamps should be within reasonable time of each other (4 hours)
          const minTs = Math.min(...timestamps);
          const maxTs = Math.max(...timestamps);
          expect(maxTs - minTs).toBeLessThan(14400);
        });

        it('should have reasonable price ranges', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            // Prices should be reasonable (not infinity or extremely large)
            expect(data.price).toBeLessThan(1e12);
            expect(data.price).toBeGreaterThan(1e-12);
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

  describe('Edge Cases', () => {
    it('should handle single coin request', async () => {
      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBe(1);
      expect(response.data.coins['coingecko:bitcoin']).toBeDefined();
    });

    it('should handle many coins at once', async () => {
      const manyCoins = [
        'coingecko:bitcoin',
        'coingecko:ethereum',
        'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        'arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      ].join(',');

      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT(manyCoins)
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBeGreaterThan(5);
    });

    it('should handle invalid coin gracefully', async () => {
      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT('invalid:0x0000000000000000000000000000000000000000')
      );
      
      // API may return 200 with empty data or 400/404
      if (response.status === 200) {
        expect(response.data).toHaveProperty('coins');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Specific Token Tests', () => {
    it('should return correct data for WETH', async () => {
      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT('ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
      );
      
      const weth = response.data.coins['ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'];
      expect(weth).toBeDefined();
      expect(weth.symbol).toBe('WETH');
      expect(weth.decimals).toBe(18);
      expect(weth.price).toBeGreaterThan(1000); // ETH typically > $1000
    });

    it('should return correct data for Bitcoin', async () => {
      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT('coingecko:bitcoin')
      );
      
      const btc = response.data.coins['coingecko:bitcoin'];
      expect(btc).toBeDefined();
      expect(btc.symbol).toBe('BTC');
      expect(btc.price).toBeGreaterThan(10000); // BTC typically > $10k
    });

    it('should return correct data for stablecoins', async () => {
      const response = await apiClient.get<PricesCurrentResponse>(
        endpoints.COINS.PRICES_CURRENT('ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7')
      );
      
      const usdt = response.data.coins['ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7'];
      expect(usdt).toBeDefined();
      expect(usdt.symbol).toBe('USDT');
      expect(usdt.price).toBeGreaterThan(0.95);
      expect(usdt.price).toBeLessThan(1.05); // Stablecoin should be close to $1
    });
  });
});

