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

const apiClient = createApiClient(endpoints.FEES_V2.BASE_URL);
const FEES_V2_ENDPOINTS = endpoints.FEES_V2;

describe('Fees V2 API - Chart Chain Breakdown', () => {
  let response: ApiResponse<ChartBreakdownArray>;

  beforeAll(async () => {
    response = await apiClient.get<ChartBreakdownArray>(
      FEES_V2_ENDPOINTS.CHARTS_CHAIN_BREAKDOWN('aave-v3')
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
      const result = validate(response.data, chartBreakdownArraySchema, 'ChartChainBreakdown-aave-v3');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
    });
  });

  describe('Data Validation', () => {
    it('should have [timestamp, { chain: feeValue }] tuples', () => {
      const sample = response.data.slice(0, 10);
      sample.forEach(([timestamp, breakdown]) => {
        expectValidTimestamp(timestamp);
        expect(typeof breakdown).toBe('object');
        const chains = Object.keys(breakdown);
        expect(chains.length).toBeGreaterThan(0);
        chains.forEach((chain) => {
          expectValidNumber(breakdown[chain]);
        });
      });
    });

    it('should be in chronological order', () => {
      const data = response.data;
      for (let i = 1; i < data.length; i++) {
        expect(data[i][0]).toBeGreaterThanOrEqual(data[i - 1][0]);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const res = await apiClient.get<ChartBreakdownArray>(
        FEES_V2_ENDPOINTS.CHARTS_CHAIN_BREAKDOWN('non-existent-protocol-xyz-123')
      );

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
