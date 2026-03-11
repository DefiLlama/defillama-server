import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ChartArray, isChartArray } from './types';
import { chartArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL_V2.BASE_URL);
const TVL_V2_ENDPOINTS = endpoints.TVL_V2;

describe('TVL V2 API - Chart', () => {
  const testProtocols = ['aave-v3'];
  const responses: Record<string, ApiResponse<ChartArray>> = {};

  beforeAll(async () => {
    await Promise.all(
      testProtocols.map(async (slug) => {
        responses[slug] = await apiClient.get<ChartArray>(
          TVL_V2_ENDPOINTS.CHARTS(slug)
        );
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testProtocols.forEach((protocolSlug) => {
      describe(`Protocol: ${protocolSlug}`, () => {
        it('should return successful response', () => {
          const response = responses[protocolSlug];
          expectSuccessfulResponse(response);
        });

        it('should return an array', () => {
          const response = responses[protocolSlug];
          expectArrayResponse(response);
          expect(isChartArray(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = responses[protocolSlug];
          const result = validate(response.data, chartArraySchema, `Chart-${protocolSlug}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });
      });
    });
  });

  describe('Data Validation', () => {
    testProtocols.forEach((protocolSlug) => {
      describe(`Protocol: ${protocolSlug}`, () => {
        it('should have non-empty data', () => {
          const data = responses[protocolSlug].data;
          expectNonEmptyArray(data);
          expect(data.length).toBeGreaterThan(100);
        });

        it('should have [timestamp, tvlValue] tuples', () => {
          const data = responses[protocolSlug].data;
          const sample = data.slice(0, 10);
          sample.forEach(([timestamp, tvlValue]) => {
            expect(Array.isArray([timestamp, tvlValue])).toBe(true);
            expectValidNumber(timestamp);
            expectValidNumber(tvlValue);
          });
        });

        it('should have valid timestamps', () => {
          const data = responses[protocolSlug].data;
          const sample = data.slice(0, 10);
          sample.forEach(([timestamp]) => {
            expectValidTimestamp(timestamp);
          });
        });

        it('should have non-negative TVL values', () => {
          const data = responses[protocolSlug].data;
          const sample = data.slice(0, 10);
          sample.forEach(([, tvlValue]) => {
            expectNonNegativeNumber(tvlValue);
          });
        });

        it('should be in chronological order', () => {
          const data = responses[protocolSlug].data;
          for (let i = 1; i < data.length; i++) {
            expect(data[i][0]).toBeGreaterThanOrEqual(data[i - 1][0]);
          }
        });
      });
    });
  });

  describe('Query Key Filter', () => {
    it('should return non-empty data for key=borrowed (aave-v3)', async () => {
      const response = await apiClient.get<ChartArray>(
        TVL_V2_ENDPOINTS.CHARTS('aave-v3') + '?key=borrowed'
      );

      expectSuccessfulResponse(response);
      expectArrayResponse(response);
      expectNonEmptyArray(response.data);
      expect(isChartArray(response.data)).toBe(true);
    }, 60000);

    it('should return empty array for key=staking (aave-v3)', async () => {
      const response = await apiClient.get<ChartArray>(
        TVL_V2_ENDPOINTS.CHARTS('aave-v3') + '?key=staking'
      );

      expectSuccessfulResponse(response);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    }, 60000);

    it('should return empty array for key=pool2 (aave-v3)', async () => {
      const response = await apiClient.get<ChartArray>(
        TVL_V2_ENDPOINTS.CHARTS('aave-v3') + '?key=pool2'
      );

      expectSuccessfulResponse(response);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    }, 60000);
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<ChartArray>(
        TVL_V2_ENDPOINTS.CHARTS('non-existent-protocol-xyz-123')
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should have key=borrowed values smaller than key=all values at every timestamp', async () => {
      const [borrowedRes, allRes] = await Promise.all([
        apiClient.get<ChartArray>(TVL_V2_ENDPOINTS.CHARTS('aave-v3') + '?key=borrowed'),
        apiClient.get<ChartArray>(TVL_V2_ENDPOINTS.CHARTS('aave-v3') + '?key=all'),
      ]);

      expectSuccessfulResponse(borrowedRes);
      expectSuccessfulResponse(allRes);

      const allByTimestamp = new Map(allRes.data.map(([ts, val]) => [ts, val]));

      borrowedRes.data.forEach(([timestamp, borrowedValue]) => {
        const allValue = allByTimestamp.get(timestamp);
        if (allValue !== undefined) {
          expect(borrowedValue).toBeLessThanOrEqual(allValue);
        }
      });
    }, 60000);
  });
});
