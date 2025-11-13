import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ProtocolTvl, isProtocolTvl } from './types';
import { protocolTvlSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Protocol TVL', () => {
  const testProtocols = ['ethereum', 'uniswap', 'aave', 'compound', 'makerdao'];
  const protocolEndpoints = testProtocols.map(slug => TVL_ENDPOINTS.TVL(slug));
  const NONEXISTENT_ENDPOINT = TVL_ENDPOINTS.TVL('non-existent-protocol-xyz-123');
  const ETHEREUM_ENDPOINT = protocolEndpoints[0];

  describe('Basic Response Validation', () => {
    testProtocols.forEach((protocolSlug, idx) => {
      describe(`Protocol: ${protocolSlug}`, () => {
        let protocolTvlResponse: ApiResponse<ProtocolTvl>;

        beforeAll(async () => {
          protocolTvlResponse = await apiClient.get<ProtocolTvl>(protocolEndpoints[idx]);
        });

        it('should return successful response', () => {
          expectSuccessfulResponse(protocolTvlResponse);
        });

        it('should return a number', () => {
          expect(typeof protocolTvlResponse.data).toBe('number');
          expect(isProtocolTvl(protocolTvlResponse.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(protocolTvlResponse.data, protocolTvlSchema, `ProtocolTvl-${protocolSlug}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });

        it('should have valid TVL value', () => {
          expectValidNumber(protocolTvlResponse.data);
          expectNonNegativeNumber(protocolTvlResponse.data);
          expect(protocolTvlResponse.data).toBeLessThan(10_000_000_000_000);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<ProtocolTvl>(NONEXISTENT_ENDPOINT);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle parent protocols', async () => {
      const response = await apiClient.get<ProtocolTvl>(ETHEREUM_ENDPOINT);

      if (response.status === 200) {
        expectValidNumber(response.data);
        expectNonNegativeNumber(response.data);
      }
    });
  });
});

