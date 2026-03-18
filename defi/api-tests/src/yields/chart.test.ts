import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChartResponse, isChartResponse } from './types';
import { chartResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - Chart', () => {
  const testPools = [
    '747c1d2a-c668-4682-b9f9-296708a3dd90', // Lido stETH
  ];

  testPools.forEach((poolId) => {
    describe(`Pool: ${poolId}`, () => {
      let chartResponse: ApiResponse<ChartResponse>;

      beforeAll(async () => {
        chartResponse = await apiClient.get<ChartResponse>(endpoints.YIELDS_PRO.CHART(poolId));
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(chartResponse);
          expect(chartResponse.data).toHaveProperty('status');
          expect(chartResponse.data).toHaveProperty('data');
          expect(chartResponse.data.status).toBe('success');
          expect(Array.isArray(chartResponse.data.data)).toBe(true);
          expect(isChartResponse(chartResponse.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(chartResponse.data, chartResponseSchema, `Chart-${poolId}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors (first 5):', result.errors.slice(0, 5));
          }
        });

        it('should return a non-empty array', () => {
          expect(chartResponse.data.data.length).toBeGreaterThan(0);
        });

        it('should have sufficient historical data', () => {
          expect(chartResponse.data.data.length).toBeGreaterThan(10);
        });
      });

      describe('Chart Data Point Validation', () => {
        it('should have required fields in all data points', () => {
          chartResponse.data.data.slice(0, 20).forEach((point) => {
            expect(point).toHaveProperty('timestamp');
            expect(typeof point.timestamp).toBe('string');
          });
        });

        it('should have valid timestamp format', () => {
          chartResponse.data.data.slice(0, 20).forEach((point) => {
            expect(() => new Date(point.timestamp)).not.toThrow();
            const date = new Date(point.timestamp);
            expect(date.getTime()).toBeGreaterThan(0);
          });
        });

        it('should have valid TVL values when present', () => {
          const pointsWithTvl = chartResponse.data.data
            .filter((point) => point.tvlUsd !== undefined)
            .slice(0, 20);

          if (pointsWithTvl.length > 0) {
            pointsWithTvl.forEach((point) => {
              expectValidNumber(point.tvlUsd!);
              expectNonNegativeNumber(point.tvlUsd!);
            });
          }
        });

        it('should have valid APY values when present', () => {
          const pointsWithApy = chartResponse.data.data
            .filter((point) => point.apy !== null && point.apy !== undefined)
            .slice(0, 20);

          if (pointsWithApy.length > 0) {
            pointsWithApy.forEach((point) => {
              expectValidNumber(point.apy!);
              expect(point.apy!).toBeGreaterThan(-100);
              expect(point.apy!).toBeLessThan(10000);
            });
          }
        });

        it('should have chronologically ordered timestamps', () => {
          const timestamps = chartResponse.data.data.map((point) =>
            new Date(point.timestamp).getTime()
          );

          for (let i = 0; i < timestamps.length - 1; i++) {
            expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
          }
        });
      });

      describe('Data Quality Validation', () => {
        it('should have fresh data', () => {
          const timestamps = chartResponse.data.data.map((point) =>
            Math.floor(new Date(point.timestamp).getTime() / 1000)
          );
          expectFreshData(timestamps, 86400 * 7); // 7 days
        });

        it('should have reasonable data coverage', () => {
          const firstDate = new Date(chartResponse.data.data[0].timestamp);
          const lastDate = new Date(
            chartResponse.data.data[chartResponse.data.data.length - 1].timestamp
          );
          const daysDiff =
            (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

          expect(daysDiff).toBeGreaterThan(7); // At least a week of data
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent pool gracefully', async () => {
      const response = await apiClient.get<ChartResponse>(
        endpoints.YIELDS_PRO.CHART('non-existent-pool-xyz-123')
      );

      if (response.status === 200) {
        expect(response.data).toBeDefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});

