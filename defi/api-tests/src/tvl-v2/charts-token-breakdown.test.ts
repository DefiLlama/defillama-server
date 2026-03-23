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
  const testProtocols = ['aave-v3', 'morpho'];
  const responses: Record<string, ApiResponse<ChartBreakdownArray>> = {};

  beforeAll(async () => {
    await Promise.all(
      testProtocols.map(async (slug) => {
        responses[slug] = await apiClient.get<ChartBreakdownArray>(
          TVL_V2_ENDPOINTS.CHARTS_TOKEN_BREAKDOWN(slug)
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

        it('should return a non-empty array', () => {
          const response = responses[protocolSlug];
          expectArrayResponse(response);
          expectNonEmptyArray(response.data);
          expect(isChartBreakdownArray(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = responses[protocolSlug];
          const result = validate(response.data, chartBreakdownArraySchema, `ChartTokenBreakdown-${protocolSlug}`);
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
        it('should have [timestamp, { token: amount }] tuples', () => {
          const sample = responses[protocolSlug].data.slice(0, 10);
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
          const data = responses[protocolSlug].data;
          for (let i = 1; i < data.length; i++) {
            expect(data[i][0]).toBeGreaterThanOrEqual(data[i - 1][0]);
          }
        });

        it('should return token amounts in native units with currency=token', async () => {
          const res = await apiClient.get<ChartBreakdownArray>(
            TVL_V2_ENDPOINTS.CHARTS_TOKEN_BREAKDOWN(protocolSlug) + '?currency=token'
          );

          expectSuccessfulResponse(res);
          expectArrayResponse(res);
          expectNonEmptyArray(res.data);

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
    });
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
