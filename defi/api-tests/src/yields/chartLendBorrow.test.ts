import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import {
  ChartLendBorrowResponse,
  isChartLendBorrowResponse,
  PoolsBorrowResponse,
} from './types';
import { chartLendBorrowResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - Chart Lend Borrow', () => {
  let testPoolId: string;
  let chartLendBorrowResponse: ApiResponse<ChartLendBorrowResponse>;

  beforeAll(async () => {
    // Get a pool ID from the borrow pools endpoint
    const poolsResponse = await apiClient.get<PoolsBorrowResponse>(
      endpoints.YIELDS_PRO.POOLS_BORROW
    );

    if (poolsResponse.data && (poolsResponse.data as any).data && (poolsResponse.data as any).data[0]) {
      testPoolId = (poolsResponse.data as any).data[0].pool;
    } else {
      throw new Error('Could not fetch test pool ID');
    }

    chartLendBorrowResponse = await apiClient.get<ChartLendBorrowResponse>(
      endpoints.YIELDS_PRO.CHART_LEND_BORROW(testPoolId)
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(chartLendBorrowResponse);
      expect(chartLendBorrowResponse.data).toHaveProperty('status');
      expect(chartLendBorrowResponse.data).toHaveProperty('data');
      expect(chartLendBorrowResponse.data.status).toBe('success');
      expect(Array.isArray(chartLendBorrowResponse.data.data)).toBe(true);
      expect(isChartLendBorrowResponse(chartLendBorrowResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        chartLendBorrowResponse.data,
        chartLendBorrowResponseSchema,
        `ChartLendBorrow-${testPoolId}`
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(chartLendBorrowResponse.data.data.length).toBeGreaterThan(0);
    });

    it('should have sufficient historical data', () => {
      expect(chartLendBorrowResponse.data.data.length).toBeGreaterThan(5);
    });
  });

  describe('Chart Data Point Validation', () => {
    it('should have required fields in all data points', () => {
      chartLendBorrowResponse.data.data.slice(0, 20).forEach((point) => {
        expect(point).toHaveProperty('timestamp');
        expect(typeof point.timestamp).toBe('string');
      });
    });

    it('should have valid timestamp format', () => {
      chartLendBorrowResponse.data.data.slice(0, 20).forEach((point) => {
        expect(() => new Date(point.timestamp)).not.toThrow();
        const date = new Date(point.timestamp);
        expect(date.getTime()).toBeGreaterThan(0);
      });
    });

    it('should have valid supply and borrow values when present', () => {
      chartLendBorrowResponse.data.data.slice(0, 20).forEach((point) => {
        if (point.totalSupplyUsd !== undefined) {
          expectValidNumber(point.totalSupplyUsd);
          expectNonNegativeNumber(point.totalSupplyUsd);
        }

        if (point.totalBorrowUsd !== undefined) {
          expectValidNumber(point.totalBorrowUsd);
          expectNonNegativeNumber(point.totalBorrowUsd);
        }
      });
    });

    it('should have valid APY values when present', () => {
      const pointsWithApy = chartLendBorrowResponse.data.data
        .filter((point) => point.apyBase !== null && point.apyBase !== undefined)
        .slice(0, 20);

      if (pointsWithApy.length > 0) {
        pointsWithApy.forEach((point) => {
          expectValidNumber(point.apyBase!);
          expect(point.apyBase!).toBeGreaterThan(-100);
          expect(point.apyBase!).toBeLessThan(10000);
        });
      }
    });

    it('should have valid borrow APY values when present', () => {
      const pointsWithBorrowApy = chartLendBorrowResponse.data.data
        .filter((point) => point.apyBorrow !== null && point.apyBorrow !== undefined)
        .slice(0, 20);

      if (pointsWithBorrowApy.length > 0) {
        pointsWithBorrowApy.forEach((point) => {
          expectValidNumber(point.apyBorrow!);
          expect(point.apyBorrow!).toBeGreaterThan(-100);
          expect(point.apyBorrow!).toBeLessThan(10000);
        });
      }
    });

    it('should have valid LTV values when present', () => {
      const pointsWithLtv = chartLendBorrowResponse.data.data
        .filter((point) => point.ltv !== null && point.ltv !== undefined)
        .slice(0, 20);

      if (pointsWithLtv.length > 0) {
        pointsWithLtv.forEach((point) => {
          expectValidNumber(point.ltv!);
          expect(point.ltv!).toBeGreaterThan(0);
          expect(point.ltv!).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should have chronologically ordered timestamps', () => {
      const timestamps = chartLendBorrowResponse.data.data.map((point) =>
        new Date(point.timestamp).getTime()
      );

      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have fresh data', () => {
      const timestamps = chartLendBorrowResponse.data.data.map((point) =>
        Math.floor(new Date(point.timestamp).getTime() / 1000)
      );
      expectFreshData(timestamps, 86400 * 7); // 7 days
    });

    it('should have borrow not exceeding supply', () => {
      const pointsWithBoth = chartLendBorrowResponse.data.data.filter(
        (point) =>
          point.totalSupplyUsd !== undefined &&
          point.totalBorrowUsd !== undefined &&
          point.totalSupplyUsd > 0 &&
          point.totalBorrowUsd > 0
      );

      if (pointsWithBoth.length > 0) {
        pointsWithBoth.slice(0, 20).forEach((point) => {
          expect(point.totalBorrowUsd!).toBeLessThanOrEqual(point.totalSupplyUsd! * 1.1);
        });
      }
    });

    it('should have reasonable data coverage', () => {
      if (chartLendBorrowResponse.data.data.length > 1) {
        const firstDate = new Date(chartLendBorrowResponse.data.data[0].timestamp);
        const lastDate = new Date(
          chartLendBorrowResponse.data.data[chartLendBorrowResponse.data.data.length - 1].timestamp
        );
        const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

        expect(daysDiff).toBeGreaterThan(0);
      }
    });
  });
});

