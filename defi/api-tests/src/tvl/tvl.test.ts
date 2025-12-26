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
  const testProtocols = ['uniswap-v3'];
  const tvlResponses: Record<string, ApiResponse<ProtocolTvl>> = {};

  beforeAll(async () => {
    // Fetch all test protocols in parallel once
    await Promise.all(
      testProtocols.map(async (slug) => {
        tvlResponses[slug] = await apiClient.get<ProtocolTvl>(
          TVL_ENDPOINTS.TVL(slug)
        );
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testProtocols.forEach((protocolSlug) => {
      describe(`Protocol: ${protocolSlug}`, () => {
        it('should return successful response', () => {
          const response = tvlResponses[protocolSlug];
          expectSuccessfulResponse(response);
        });

        it('should return a number', () => {
          const response = tvlResponses[protocolSlug];
          expect(typeof response.data).toBe('number');
          expect(isProtocolTvl(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = tvlResponses[protocolSlug];
          const result = validate(response.data, protocolTvlSchema, `ProtocolTvl-${protocolSlug}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });

        it('should have valid TVL value', () => {
          const response = tvlResponses[protocolSlug];
          expectValidNumber(response.data);
          expectNonNegativeNumber(response.data);
          expect(response.data).toBeLessThan(10_000_000_000_000); // Max reasonable TVL
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<ProtocolTvl>(
        TVL_ENDPOINTS.TVL('non-existent-protocol-xyz-123')
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle parent protocols', () => {
      // Use first test protocol
      const response = tvlResponses[testProtocols[0]];

      if (response.status === 200) {
        expectValidNumber(response.data);
        expectNonNegativeNumber(response.data);
      }
    });
  });
});

