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
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL_V2.BASE_URL);
const TVL_V2_ENDPOINTS = endpoints.TVL_V2;

describe('TVL V2 API - Metrics Protocol Overview', () => {
  const testProtocols = ['aave-v3', 'morpho'];
  const responses: Record<string, ApiResponse<MetricsProtocol>> = {};

  beforeAll(async () => {
    await Promise.all(
      testProtocols.map(async (slug) => {
        responses[slug] = await apiClient.get<MetricsProtocol>(
          TVL_V2_ENDPOINTS.PROTOCOL(slug)
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
          expectNonEmptyString(data.id);
          expectNonEmptyString(data.name);
          expect(Array.isArray(data.chains)).toBe(true);
          if (!data.isParentProtocol) {
            expectNonEmptyArray(data.chains);
          }
        });

        it('should have currentChainTvls with valid numbers', () => {
          const data = responses[protocolSlug].data;
          expect(data.currentChainTvls).toBeDefined();
          if (data.currentChainTvls) {
            const chains = Object.keys(data.currentChainTvls);
            expect(chains.length).toBeGreaterThan(0);
            chains.forEach((chain) => {
              expectValidNumber(data.currentChainTvls![chain]);
              expectNonNegativeNumber(data.currentChainTvls![chain]);
            });
          }
        });

        it('should NOT contain heavy historical data fields', () => {
          const data = responses[protocolSlug].data as any;
          expect(data.tvl).toBeUndefined();
          expect(data.chainTvls).toBeUndefined();
          expect(data.tokens).toBeUndefined();
          expect(data.tokensInUsd).toBeUndefined();
        });

        it('should have valid mcap if present', () => {
          const data = responses[protocolSlug].data;
          if (data.mcap !== undefined && data.mcap !== null) {
            expectValidNumber(data.mcap);
            expectNonNegativeNumber(data.mcap);
          }
        });

        it('should have valid raises array if present', () => {
          const data = responses[protocolSlug].data;
          if (data.raises !== undefined) {
            expect(Array.isArray(data.raises)).toBe(true);
          }
        });

      });
    });
  });

  describe('Edge Cases', () => {
    it('should have parentProtocolSlug equal to aave', () => {
      const data = responses['aave-v3'].data;
      expect(data.parentProtocolSlug).toBe('aave');
    });

    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<MetricsProtocol>(
        TVL_V2_ENDPOINTS.PROTOCOL('non-existent-protocol-xyz-123')
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle parent protocols', async () => {
      const response = await apiClient.get<MetricsProtocol>(
        TVL_V2_ENDPOINTS.PROTOCOL('aave')
      );

      if (response.status === 200) {
        expectObjectResponse(response);
        expect(response.data.name).toBeDefined();
        expect(Array.isArray(response.data.chains)).toBe(true);
      }
    }, 60000);
  });
});
