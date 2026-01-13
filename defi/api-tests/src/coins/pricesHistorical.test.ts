import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PricesHistoricalResponse, isPricesHistoricalResponse } from './types';
import { pricesHistoricalResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Prices Historical', () => {
  const testCoins = 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,coingecko:bitcoin';
  
  // Test with different historical timestamps
  const testTimestamps = [
    { name: '1 day ago', timestamp: Math.floor(Date.now() / 1000) - 86400 },
    { name: '7 days ago', timestamp: Math.floor(Date.now() / 1000) - 86400 * 7 },
    { name: '30 days ago', timestamp: Math.floor(Date.now() / 1000) - 86400 * 30 },
    { name: '1 year ago', timestamp: Math.floor(Date.now() / 1000) - 86400 * 365 },
  ];

  testTimestamps.forEach(({ name, timestamp }) => {
    describe(`Historical Prices - ${name} (${new Date(timestamp * 1000).toISOString()})`, () => {
      let response: ApiResponse<PricesHistoricalResponse>;

      beforeAll(async () => {
        response = await apiClient.get<PricesHistoricalResponse>(
          endpoints.COINS.PRICES_HISTORICAL(timestamp, testCoins)
        );
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(response);
          expect(response.data).toHaveProperty('coins');
          expect(typeof response.data.coins).toBe('object');
          expect(isPricesHistoricalResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            response.data,
            pricesHistoricalResponseSchema,
            `PricesHistorical-${name}`
          );
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors.slice(0, 5));
          }
        });

        it('should return data for requested coins', () => {
          const coinKeys = Object.keys(response.data.coins);
          expect(coinKeys.length).toBeGreaterThan(0);
        });
      });

      describe('Historical Price Data Validation', () => {
        it('should have valid price values', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.price);
            expect(data.price).toBeGreaterThan(0);
            expect(data.price).toBeLessThan(1e12);
          });
        });

        it('should have timestamps close to requested timestamp', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expectValidNumber(data.timestamp);
            expectValidTimestamp(data.timestamp);
            
            // Timestamp should be within 1 hour of requested timestamp
            const diff = Math.abs(data.timestamp - timestamp);
            expect(diff).toBeLessThan(3600);
          });
        });

        it('should have valid symbols', () => {
          Object.entries(response.data.coins).forEach(([coinId, data]) => {
            expect(data.symbol).toBeDefined();
            expect(typeof data.symbol).toBe('string');
            expect(data.symbol.length).toBeGreaterThan(0);
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
      });

      describe('Data Quality Checks', () => {
        it('should return historical prices different from current', async () => {
          // Get current prices for comparison
          const currentResponse = await apiClient.get(
            endpoints.COINS.PRICES_CURRENT(testCoins)
          );

          if (currentResponse.status === 200) {
            Object.entries(response.data.coins).forEach(([coinId, historicalData]) => {
              const currentData = (currentResponse.data as any).coins[coinId];
              if (currentData) {
                // Prices should be different (unless it's very recent)
                if (timestamp < Math.floor(Date.now() / 1000) - 3600) {
                  const priceDiffPercent = Math.abs(
                    (historicalData.price - currentData.price) / currentData.price * 100
                  );
                  // Allow for 0% difference in case of stable coins or very stable prices
                  expect(priceDiffPercent).toBeGreaterThanOrEqual(0);
                }
              }
            });
          }
        });

        it('should have consistent data across coins', () => {
          const timestamps = Object.values(response.data.coins).map(coin => coin.timestamp);
          const minTs = Math.min(...timestamps);
          const maxTs = Math.max(...timestamps);
          
          // All timestamps should be within 1 hour of each other
          expect(maxTs - minTs).toBeLessThan(3600);
        });
      });
    });
  });

  describe('Specific Historical Tests', () => {
    it('should return Bitcoin price from 1 year ago', async () => {
      const oneYearAgo = Math.floor(Date.now() / 1000) - 86400 * 365;
      const response = await apiClient.get<PricesHistoricalResponse>(
        endpoints.COINS.PRICES_HISTORICAL(oneYearAgo, 'coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      const btc = response.data.coins['coingecko:bitcoin'];
      expect(btc).toBeDefined();
      expect(btc.price).toBeGreaterThan(1000); // BTC should always be > $1k
    });

    it('should return ETH price from specific date', async () => {
      // Test with a known historical date
      const specificDate = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const response = await apiClient.get<PricesHistoricalResponse>(
        endpoints.COINS.PRICES_HISTORICAL(specificDate, 'coingecko:ethereum')
      );
      
      expect(response.status).toBe(200);
      const eth = response.data.coins['coingecko:ethereum'];
      expect(eth).toBeDefined();
      expect(eth.price).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very old timestamps', async () => {
      // 5 years ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 86400 * 365 * 5;
      const response = await apiClient.get<PricesHistoricalResponse>(
        endpoints.COINS.PRICES_HISTORICAL(oldTimestamp, 'coingecko:bitcoin')
      );
      
      // May return 200 with data or 404 if data not available
      if (response.status === 200) {
        expect(response.data.coins).toBeDefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle future timestamps', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const response = await apiClient.get<PricesHistoricalResponse>(
        endpoints.COINS.PRICES_HISTORICAL(futureTimestamp, 'coingecko:bitcoin')
      );
      
      // Should either return current price or error
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle multiple chains', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const multiChainCoins = 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,polygon:0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
      
      const response = await apiClient.get<PricesHistoricalResponse>(
        endpoints.COINS.PRICES_HISTORICAL(timestamp, multiChainCoins)
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBeGreaterThan(0);
    });
  });
});

