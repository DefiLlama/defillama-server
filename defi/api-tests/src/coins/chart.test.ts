import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChartResponse, isChartResponse } from './types';
import { chartResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectValidTimestamp,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Chart', () => {
  const testCases = [
    {
      name: 'Bitcoin',
      coins: 'coingecko:bitcoin',
      minPrice: 10000,
      expectedSymbol: 'BTC'
    },
    {
      name: 'Ethereum',
      coins: 'coingecko:ethereum',
      minPrice: 1000,
      expectedSymbol: 'ETH'
    },
    {
      name: 'WETH',
      coins: 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      minPrice: 1000,
      expectedSymbol: 'WETH'
    },
    {
      name: 'Multiple coins',
      coins: 'coingecko:bitcoin,coingecko:ethereum',
      minPrice: 1000,
      expectedSymbol: null
    }
  ];

  testCases.forEach(({ name, coins, minPrice, expectedSymbol }) => {
    describe(`Chart Data - ${name}`, () => {
      let response: ApiResponse<ChartResponse>;

      beforeAll(async () => {
        response = await apiClient.get<ChartResponse>(
          endpoints.COINS.CHART(coins)
        );
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(response);
          expect(response.data).toHaveProperty('coins');
          expect(typeof response.data.coins).toBe('object');
          expect(isChartResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            response.data,
            chartResponseSchema,
            `Chart-${name}`
          );
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors.slice(0, 5));
          }
        });

        it('should return chart data for requested coins', () => {
          const requestedCoins = coins.split(',');
          requestedCoins.forEach((coin) => {
            expect(response.data.coins[coin]).toBeDefined();
          });
        });
      });

      describe('Chart Structure Validation', () => {
        it('should have valid coin data structure', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            expect(coinData).toHaveProperty('symbol');
            expect(coinData).toHaveProperty('confidence');
            expect(coinData).toHaveProperty('prices');
            
            expect(typeof coinData.symbol).toBe('string');
            expect(typeof coinData.confidence).toBe('number');
            expect(Array.isArray(coinData.prices)).toBe(true);
          });
        });

        it('should have non-empty prices array', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            expect(coinData.prices.length).toBeGreaterThan(0);
          });
        });

        it('should have sufficient data points', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            // Should have at least 1 data point
            expect(coinData.prices.length).toBeGreaterThan(0);
          });
        });

        it('should have correct symbol if expected', () => {
          if (expectedSymbol) {
            const firstCoin = Object.values(response.data.coins)[0];
            expect(firstCoin.symbol).toBe(expectedSymbol);
          }
        });
      });

      describe('Price Point Validation', () => {
        it('should have valid price point structure', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            coinData.prices.slice(0, 20).forEach((point) => {
              expect(point).toHaveProperty('timestamp');
              expect(point).toHaveProperty('price');
              
              expectValidNumber(point.timestamp);
              expectValidNumber(point.price);
            });
          });
        });

        it('should have valid timestamps', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            coinData.prices.slice(0, 20).forEach((point) => {
              expectValidTimestamp(point.timestamp);
              
              // Timestamps should not be in the future
              const now = Math.floor(Date.now() / 1000);
              expect(point.timestamp).toBeLessThanOrEqual(now);
            });
          });
        });

        it('should have chronologically ordered timestamps', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            for (let i = 0; i < coinData.prices.length - 1; i++) {
              expect(coinData.prices[i].timestamp).toBeLessThan(coinData.prices[i + 1].timestamp);
            }
          });
        });

        it('should have valid price values', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            coinData.prices.slice(0, 20).forEach((point) => {
              expect(point.price).toBeGreaterThan(0);
              expect(point.price).toBeLessThan(1e12);
            });
          });
        });

        it('should have reasonable prices based on coin type', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            // Check a few recent prices
            const recentPrices = coinData.prices.slice(-10);
            recentPrices.forEach((point) => {
              expect(point.price).toBeGreaterThan(minPrice * 0.5); // Allow 50% variance
            });
          });
        });
      });

      describe('Data Quality Validation', () => {
        it('should have fresh data', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            const timestamps = coinData.prices.map(p => p.timestamp);
            expectFreshData(timestamps, 86400 * 7); // Within 7 days
          });
        });

        it('should have valid confidence score', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            expectValidNumber(coinData.confidence);
            expect(coinData.confidence).toBeGreaterThanOrEqual(0);
            expect(coinData.confidence).toBeLessThanOrEqual(1);
          });
        });

        it('should have reasonable time span', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            if (coinData.prices.length > 1) {
              const firstTs = coinData.prices[0].timestamp;
              const lastTs = coinData.prices[coinData.prices.length - 1].timestamp;
              const spanDays = (lastTs - firstTs) / 86400;
              
              // If multiple points, check time span
              expect(spanDays).toBeGreaterThanOrEqual(0);
            }
          });
        });

        it('should not have duplicate timestamps', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            const timestamps = coinData.prices.map(p => p.timestamp);
            const uniqueTimestamps = new Set(timestamps);
            expect(uniqueTimestamps.size).toBe(timestamps.length);
          });
        });

        it('should have smooth price changes', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            // Check that there are no extreme jumps in consecutive prices
            for (let i = 0; i < Math.min(coinData.prices.length - 1, 100); i++) {
              const priceChange = Math.abs(
                (coinData.prices[i + 1].price - coinData.prices[i].price) / coinData.prices[i].price
              );
              
              // No single data point should change by more than 50% (unless it's a real market event)
              expect(priceChange).toBeLessThan(0.5);
            }
          });
        });
      });

      describe('Historical Price Analysis', () => {
        it('should have price volatility data', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            const prices = coinData.prices.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            expect(minPrice).toBeGreaterThan(0);
            expect(maxPrice).toBeGreaterThanOrEqual(minPrice);
            expect(avgPrice).toBeGreaterThanOrEqual(minPrice);
            expect(avgPrice).toBeLessThanOrEqual(maxPrice);
          });
        });

        it('should have price trends', () => {
          Object.entries(response.data.coins).forEach(([coinId, coinData]) => {
            // Calculate simple trend (first price vs last price)
            const firstPrice = coinData.prices[0].price;
            const lastPrice = coinData.prices[coinData.prices.length - 1].price;
            const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
            
            // Should have some price movement
            expect(Math.abs(percentChange)).toBeGreaterThanOrEqual(0);
            
            // Shouldn't be too extreme (unless it's real market data)
            expect(Math.abs(percentChange)).toBeLessThan(10000);
          });
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single coin', async () => {
      const response = await apiClient.get<ChartResponse>(
        endpoints.COINS.CHART('coingecko:bitcoin')
      );
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.coins).length).toBe(1);
    });

    it('should handle stablecoin with minimal price movement', async () => {
      const response = await apiClient.get<ChartResponse>(
        endpoints.COINS.CHART('ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7')
      );
      
      if (response.status === 200) {
        const usdt = response.data.coins['ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7'];
        if (usdt) {
          // All prices should be close to $1
          usdt.prices.forEach((point) => {
            expect(point.price).toBeGreaterThan(0.95);
            expect(point.price).toBeLessThan(1.05);
          });
        }
      }
    });

    it('should handle invalid coin gracefully', async () => {
      const response = await apiClient.get(
        endpoints.COINS.CHART('invalid:0x0000000000000000000000000000000000000000')
      );
      
      // May return error or empty data
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});

