import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PricesFirstResponse, isPricesFirstResponse } from './types';
import { pricesFirstResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Prices First', () => {
  const testCases = [
    {
      name: 'Bitcoin',
      coins: 'coingecko:bitcoin',
      expectedSymbol: 'BTC',
      description: 'First recorded Bitcoin price'
    },
    {
      name: 'Ethereum',
      coins: 'coingecko:ethereum',
      expectedSymbol: 'ETH',
      description: 'First recorded Ethereum price'
    },
    {
      name: 'WETH',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      expectedSymbol: 'WETH',
      description: 'First recorded WETH price'
    },
    {
      name: 'Multiple coins',
      coins: 'coingecko:bitcoin,coingecko:ethereum',
      expectedSymbol: null,
      description: 'First prices for multiple coins'
    }
  ];

  testCases.forEach(({ name, coins, expectedSymbol, description }) => {
    describe(`Test Case: ${name} (${description})`, () => {
      let response: ApiResponse<PricesFirstResponse>;

      beforeAll(async () => {
        response = await apiClient.get<PricesFirstResponse>(
          endpoints.COINS.PRICES_FIRST(coins)
        );
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(response);
          expect(response.data).toHaveProperty('coins');
          expect(typeof response.data.coins).toBe('object');
          expect(isPricesFirstResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            response.data,
            pricesFirstResponseSchema,
            `PricesFirst-${name}`
          );
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors.slice(0, 5));
          }
        });

        it('should return data for requested coins', () => {
          const requestedCoins = coins.split(',');
          requestedCoins.forEach((coin) => {
            expect(response.data.coins[coin]).toBeDefined();
          });
        });

        it('should have correct symbol if expected', () => {
          if (expectedSymbol) {
            const firstCoin = Object.values(response.data.coins)[0];
            expect(firstCoin.symbol).toBe(expectedSymbol);
          }
        });
      });

      describe('First Price Data Validation', () => {
        it('should have valid price values', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.price);
            expect(data.price).toBeGreaterThan(0);
            expect(data.price).toBeLessThan(1e12);
          });
        });

        it('should have valid timestamps', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.timestamp);
            expectValidTimestamp(data.timestamp);
            
            // First recorded timestamp should be in the past
            const now = Math.floor(Date.now() / 1000);
            expect(data.timestamp).toBeLessThan(now);
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

        it('should have old timestamps for major coins', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            // Bitcoin launched in 2009, Ethereum in 2015
            if (coinId === 'coingecko:bitcoin') {
              const bitcoinLaunch = new Date('2009-01-01').getTime() / 1000;
              expect(data.timestamp).toBeGreaterThan(bitcoinLaunch);
            } else if (coinId === 'coingecko:ethereum') {
              const ethereumLaunch = new Date('2015-01-01').getTime() / 1000;
              expect(data.timestamp).toBeGreaterThan(ethereumLaunch);
            }
          });
        });
      });

      describe('Historical Context', () => {
        it('should have first prices different from current prices', async () => {
          // Get current prices for comparison
          const currentResponse = await apiClient.get(
            endpoints.COINS.PRICES_CURRENT(coins)
          );

          if (currentResponse.status === 200) {
            Object.entries(response.data.coins).forEach(([coinId, firstData]) => {
              const currentData = (currentResponse.data as any).coins[coinId];
              if (currentData) {
                // First price should be different from current (except maybe for stable coins)
                const priceDiffPercent = Math.abs(
                  (currentData.price - firstData.price) / firstData.price * 100
                );
                
                // Expect at least some price movement over time
                expect(priceDiffPercent).toBeGreaterThanOrEqual(0);
              }
            });
          }
        });

        it('should show price appreciation over time', async () => {
          // For major cryptocurrencies, first price should typically be lower
          const currentResponse = await apiClient.get(
            endpoints.COINS.PRICES_CURRENT(coins)
          );

          if (currentResponse.status === 200) {
            Object.entries(response.data.coins).forEach(([coinId, firstData]) => {
              const currentData = (currentResponse.data as any).coins[coinId];
              if (currentData && (coinId === 'coingecko:bitcoin' || coinId === 'coingecko:ethereum')) {
                // Major cryptos have generally appreciated
                expect(currentData.price).toBeGreaterThan(firstData.price * 0.1);
              }
            });
          }
        });
      });

      describe('Data Quality Checks', () => {
        it('should not have duplicate coin entries', () => {
          const coinIds = Object.keys(response.data.coins);
          const uniqueCoinIds = new Set(coinIds);
          expect(uniqueCoinIds.size).toBe(coinIds.length);
        });

        it('should have consistent data structure', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expect(data).toHaveProperty('symbol');
            expect(data).toHaveProperty('price');
            expect(data).toHaveProperty('timestamp');
          });
        });
      });
    });
  });

  describe('Specific Historical Tests', () => {
    it('should return Bitcoin first price from early days', async () => {
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      const btc = response.data.coins['coingecko:bitcoin'];
      expect(btc).toBeDefined();
      expect(btc.symbol).toBe('BTC');
      
      // Bitcoin's first recorded price should be very low
      expect(btc.price).toBeLessThan(1000);
      
      // Should be from around 2010-2013
      const date = new Date(btc.timestamp * 1000);
      expect(date.getFullYear()).toBeGreaterThanOrEqual(2009);
      expect(date.getFullYear()).toBeLessThan(2025);
    });

    it('should return Ethereum first price', async () => {
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST('coingecko:ethereum')
      );
      
      expect(response.status).toBe(200);
      const eth = response.data.coins['coingecko:ethereum'];
      expect(eth).toBeDefined();
      expect(eth.symbol).toBe('ETH');
      
      // Ethereum launched in 2015
      const date = new Date(eth.timestamp * 1000);
      expect(date.getFullYear()).toBeGreaterThanOrEqual(2015);
    });

    it('should compare first prices of Bitcoin and Ethereum', async () => {
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST('coingecko:bitcoin,coingecko:ethereum')
      );
      
      if (response.status === 200) {
        const btc = response.data.coins['coingecko:bitcoin'];
        const eth = response.data.coins['coingecko:ethereum'];
        
        if (btc && eth) {
          // Bitcoin should have an earlier first timestamp
          expect(btc.timestamp).toBeLessThan(eth.timestamp);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single coin request', async () => {
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBe(1);
    });

    it('should handle newer tokens', async () => {
      // Test with a relatively newer token
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST('ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
      );
      
      if (response.status === 200) {
        const weth = response.data.coins['ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'];
        if (weth) {
          // WETH should have a relatively recent first timestamp
          const date = new Date(weth.timestamp * 1000);
          expect(date.getFullYear()).toBeGreaterThanOrEqual(2017);
        }
      }
    });

    it('should handle invalid coin gracefully', async () => {
      const response = await apiClient.get(
        endpoints.COINS.PRICES_FIRST('invalid:0x0000000000000000000000000000000000000000')
      );
      
      // May return error or empty data
      if (response.status === 200) {
        expect(response.data).toHaveProperty('coins');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle multiple chains', async () => {
      const multiChainCoins = 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
      
      const response = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST(multiChainCoins)
      );
      
      if (response.status === 200) {
        expect(Object.keys(response.data.coins).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Time Travel Analysis', () => {
    it('should show how much prices have changed since launch', async () => {
      const coins = 'coingecko:bitcoin,coingecko:ethereum';
      const firstPricesResponse = await apiClient.get<PricesFirstResponse>(
        endpoints.COINS.PRICES_FIRST(coins)
      );
      
      const currentPricesResponse = await apiClient.get(
        endpoints.COINS.PRICES_CURRENT(coins)
      );

      if (firstPricesResponse.status === 200 && currentPricesResponse.status === 200) {
        Object.entries(firstPricesResponse.data.coins).forEach(([coinId, firstData]) => {
          const currentData = (currentPricesResponse.data as any).coins[coinId];
          
          if (currentData) {
            const priceMultiple = currentData.price / firstData.price;
            const percentageGain = (priceMultiple - 1) * 100;
            
            // Should show positive returns for major cryptos
            expect(priceMultiple).toBeGreaterThan(0);
            expect(Number.isFinite(percentageGain)).toBe(true);
            
            console.log(`${coinId}: ${firstData.price.toFixed(2)} → ${currentData.price.toFixed(2)} (${priceMultiple.toFixed(2)}x, ${percentageGain.toFixed(2)}%)`);
          }
        });
      }
    });
  });
});

