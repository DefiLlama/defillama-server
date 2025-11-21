import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { VolumeSummaryResponse, isVolumeSummaryResponse } from './types';
import { volumeSummaryResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.VOLUMES.BASE_URL);

describe('Volumes API - Summary DEXs', () => {
  // Test with popular DEX protocols
  const testProtocols = ['uniswap', 'pancakeswap', 'curve-dex'];

  const responses: Record<string, ApiResponse<VolumeSummaryResponse>> = {};

  beforeAll(async () => {
    const results = await Promise.all(
      testProtocols.map((protocol) =>
        apiClient.get<VolumeSummaryResponse>(endpoints.VOLUMES.SUMMARY_DEXS(protocol))
      )
    );

    testProtocols.forEach((protocol, index) => {
      responses[protocol] = results[index];
    });
  }, 30000);

  describe.each(testProtocols)('Protocol: %s', (protocol) => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(responses[protocol]);
        expect(isVolumeSummaryResponse(responses[protocol].data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = volumeSummaryResponseSchema.safeParse(responses[protocol].data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have required fields', () => {
        const data = responses[protocol].data;
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('chains');
        expect(typeof data.id).toBe('string');
        expect(typeof data.name).toBe('string');
        expect(Array.isArray(data.chains)).toBe(true);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have non-empty protocol name', () => {
        expect(responses[protocol].data.name.length).toBeGreaterThan(0);
      });

      it('should have at least one chain', () => {
        expect(responses[protocol].data.chains.length).toBeGreaterThan(0);
      });

      it('should have valid chain names', () => {
        responses[protocol].data.chains.forEach((chain) => {
          expect(typeof chain).toBe('string');
          expect(chain.length).toBeGreaterThan(0);
        });
      });

      it('should have valid volume metrics when present', () => {
        const data = responses[protocol].data;

        if (data.total24h !== null && data.total24h !== undefined) {
          expectValidNumber(data.total24h);
          expectNonNegativeNumber(data.total24h);
          expect(data.total24h).toBeGreaterThan(0);
        }

        if (data.total7d !== null && data.total7d !== undefined) {
          expectValidNumber(data.total7d);
          expectNonNegativeNumber(data.total7d);
        }

        if (data.total30d !== null && data.total30d !== undefined) {
          expectValidNumber(data.total30d);
          expectNonNegativeNumber(data.total30d);
        }
      });

      it('should have valid change percentages when present', () => {
        const data = responses[protocol].data;

        if (data.change_1d !== null && data.change_1d !== undefined) {
          expectValidNumber(data.change_1d);
          expect(isNaN(data.change_1d)).toBe(false);
          expect(isFinite(data.change_1d)).toBe(true);
        }

        if (data.change_7d !== null && data.change_7d !== undefined) {
          expectValidNumber(data.change_7d);
          expect(isNaN(data.change_7d)).toBe(false);
          expect(isFinite(data.change_7d)).toBe(true);
        }
      });
    });

    describe('Chart Data Validation', () => {
      it('should have chart data when present', () => {
        const data = responses[protocol].data;

        if (data.totalDataChart && data.totalDataChart.length > 0) {
          expect(Array.isArray(data.totalDataChart)).toBe(true);
          expect(data.totalDataChart.length).toBeGreaterThan(10);

          // Check a few data points
          data.totalDataChart.slice(0, 20).forEach((point) => {
            expect(Array.isArray(point)).toBe(true);
            expect(point.length).toBe(2);

            // Timestamp
            expectValidNumber(point[0]);
            expect(point[0]).toBeGreaterThan(1400000000); // After May 2014

            // Value
            const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
            expectValidNumber(value);
            expectNonNegativeNumber(value);
          });
        }
      });

      it('should have fresh chart data when present', () => {
        const data = responses[protocol].data;

        if (data.totalDataChart && data.totalDataChart.length > 0) {
          const timestamps = data.totalDataChart.map((point) => point[0]);
          expectFreshData(timestamps, 86400 * 3); // 3 days
        }
      });

      it('should have chronologically ordered chart data', () => {
        const data = responses[protocol].data;

        if (data.totalDataChart && data.totalDataChart.length > 1) {
          const timestamps = data.totalDataChart.map((point) => point[0]);
          
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
          }
        }
      });
    });

    describe('Metadata Validation', () => {
      it('should have valid optional metadata when present', () => {
        const data = responses[protocol].data;

        if (data.logo) {
          expect(typeof data.logo).toBe('string');
          expect(data.logo.length).toBeGreaterThan(0);
        }

        if (data.url) {
          expect(typeof data.url).toBe('string');
          expect(data.url.length).toBeGreaterThan(0);
        }

        if (data.description) {
          expect(typeof data.description).toBe('string');
          expect(data.description.length).toBeGreaterThan(0);
        }

        if (data.twitter) {
          expect(typeof data.twitter).toBe('string');
        }
      });

      it('should have valid category when present', () => {
        const data = responses[protocol].data;

        if (data.category) {
          expect(typeof data.category).toBe('string');
          expect(data.category.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Cross-Protocol Comparison', () => {
    it('should have different protocol IDs', () => {
      const ids = testProtocols.map((protocol) => responses[protocol].data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(testProtocols.length);
    });

    it('should have different protocol names', () => {
      const names = testProtocols.map((protocol) => responses[protocol].data.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(testProtocols.length);
    });

    it('should have varying volume metrics', () => {
      const volumes = testProtocols
        .map((protocol) => responses[protocol].data.total24h)
        .filter((vol) => vol !== null && vol !== undefined);

      if (volumes.length > 1) {
        const uniqueVolumes = new Set(volumes.map((v) => Number(v)));
        expect(uniqueVolumes.size).toBeGreaterThan(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get(
        endpoints.VOLUMES.SUMMARY_DEXS('nonexistentprotocol123456')
      );

      // Should return 404 or similar error status
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

