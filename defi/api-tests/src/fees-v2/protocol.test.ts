import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { MetricsProtocol, isMetricsProtocol } from './types';
import { metricsProtocolSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectNonEmptyArray,
  expectNonEmptyString,
  expectValidNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.FEES_V2.BASE_URL);
const FEES_V2_ENDPOINTS = endpoints.FEES_V2;

describe('Fees V2 API - Metrics Protocol Overview', () => {
  const testProtocols = ['aave-v3'];
  const responses: Record<string, ApiResponse<MetricsProtocol>> = {};

  beforeAll(async () => {
    await Promise.all(
      testProtocols.map(async (slug) => {
        responses[slug] = await apiClient.get<MetricsProtocol>(
          FEES_V2_ENDPOINTS.PROTOCOL(slug)
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

        it('should return an object', () => {
          const response = responses[protocolSlug];
          expectObjectResponse(response);
          expect(isMetricsProtocol(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = responses[protocolSlug];
          const result = validate(response.data, metricsProtocolSchema, `MetricsProtocol-${protocolSlug}`);
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
        it('should have required identity fields', () => {
          const data = responses[protocolSlug].data;
          expectNonEmptyString(data.name);
          expectNonEmptyString(data.defillamaId);
          expect(Array.isArray(data.chains)).toBe(true);
          expectNonEmptyArray(data.chains);
        });

        it('should have fee aggregate metrics', () => {
          const data = responses[protocolSlug].data;
          expect(data.total24h).toBeDefined();
          if (data.total24h !== null && data.total24h !== undefined) {
            expectValidNumber(data.total24h);
          }
        });

        it('should have total7d and total30d if present', () => {
          const data = responses[protocolSlug].data;
          if (data.total7d !== null && data.total7d !== undefined) {
            expectValidNumber(data.total7d);
          }
          if (data.total30d !== null && data.total30d !== undefined) {
            expectValidNumber(data.total30d);
          }
        });

        it('should have change_1d if present', () => {
          const data = responses[protocolSlug].data;
          if (data.change_1d !== null && data.change_1d !== undefined) {
            expectValidNumber(data.change_1d);
          }
        });

        it('should have valid methodology', () => {
          const data = responses[protocolSlug].data;
          expect(data.methodology).toBeDefined();
          if (typeof data.methodology === 'object' && data.methodology !== null) {
            expect(Object.keys(data.methodology).length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should have parentProtocol referencing aave', () => {
      const data = responses['aave-v3'].data;
      expect(data.parentProtocol).toContain('aave');
    });

    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<MetricsProtocol>(
        FEES_V2_ENDPOINTS.PROTOCOL('non-existent-protocol-xyz-123')
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
