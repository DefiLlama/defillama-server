import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChartBreakdownArray, isChartBreakdownArray } from './types';
import { chartBreakdownArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL_V2.BASE_URL);
const TVL_V2_ENDPOINTS = endpoints.TVL_V2;

describe('TVL V2 API - Chart Token Breakdown', () => {
  let response: ApiResponse<ChartBreakdownArray>;

  beforeAll(async () => {
    response = await apiClient.get<ChartBreakdownArray>(
      TVL_V2_ENDPOINTS.CHARTS_TOKEN_BREAKDOWN('aave-v3')
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    it('should return successful response', () => {
      expectSuccessfulResponse(response);
    });

    it('should return a non-empty array', () => {
      expectArrayResponse(response);
      expectNonEmptyArray(response.data);
      expect(isChartBreakdownArray(response.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(response.data, chartBreakdownArraySchema, 'ChartTokenBreakdown-aave-v3');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
    });
  });

  describe('Data Validation', () => {
    it('should have [timestamp, { token: amount }] tuples', () => {
      const sample = response.data.slice(0, 10);
      sample.forEach(([timestamp, breakdown]) => {
        expectValidTimestamp(timestamp);
        expect(typeof breakdown).toBe('object');
        const tokens = Object.keys(breakdown);
        expect(tokens.length).toBeGreaterThan(0);
        tokens.forEach((token) => {
          expectValidNumber(breakdown[token]);
        });
      });
    });

    it('should be in chronological order', () => {
      const data = response.data;
      for (let i = 1; i < data.length; i++) {
        expect(data[i][0]).toBeGreaterThanOrEqual(data[i - 1][0]);
      }
    });

    it('should return token amounts in native units with currency=token', async () => {
      const res = await apiClient.get<ChartBreakdownArray>(
        TVL_V2_ENDPOINTS.CHARTS_TOKEN_BREAKDOWN('aave-v3') + '?currency=token'
      );

      expectSuccessfulResponse(res);
      expectArrayResponse(res);
      expectNonEmptyArray(res.data);
      expect(isChartBreakdownArray(res.data)).toBe(true);

      const sample = res.data.slice(0, 10);
      sample.forEach(([timestamp, breakdown]) => {
        expectValidTimestamp(timestamp);
        expect(typeof breakdown).toBe('object');
        const tokens = Object.keys(breakdown);
        expect(tokens.length).toBeGreaterThan(0);
        tokens.forEach((token) => {
          expectValidNumber(breakdown[token]);
        });
      });
    }, 60000);
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const res = await apiClient.get<ChartBreakdownArray>(
        TVL_V2_ENDPOINTS.CHARTS_TOKEN_BREAKDOWN('non-existent-protocol-xyz-123')
      );

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
