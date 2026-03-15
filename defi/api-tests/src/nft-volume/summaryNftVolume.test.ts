import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { NftVolumeSummaryResponse, isNftVolumeSummaryResponse } from './types';
import { nftVolumeSummaryResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.NFT_VOLUME.BASE_URL);

describe('NFT Volume API - Summary', () => {
  const testProtocols = ['ethereum', 'solana', 'polygon'];

  const responses: Record<string, ApiResponse<NftVolumeSummaryResponse>> = {};

  beforeAll(async () => {
    const results = await Promise.all(
      testProtocols.map((protocol) =>
        apiClient.get<NftVolumeSummaryResponse>(endpoints.NFT_VOLUME.SUMMARY(protocol))
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
        expect(isNftVolumeSummaryResponse(responses[protocol].data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = nftVolumeSummaryResponseSchema.safeParse(responses[protocol].data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have protocol name', () => {
        const data = responses[protocol].data;
        expect(data).toHaveProperty('name');
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have valid volume metrics when present', () => {
        const data = responses[protocol].data;

        if (data.total24h !== null && data.total24h !== undefined) {
          expectValidNumber(data.total24h);
          expectNonNegativeNumber(data.total24h);
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
          expect(isFinite(data.change_1d)).toBe(true);
        }

        if (data.change_7d !== null && data.change_7d !== undefined) {
          expectValidNumber(data.change_7d);
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

          data.totalDataChart.slice(0, 20).forEach((point) => {
            expect(Array.isArray(point)).toBe(true);
            expect(point.length).toBe(2);

            expectValidNumber(point[0]);
            expect(point[0]).toBeGreaterThan(1400000000);

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
          expectFreshData(timestamps, 86400 * 3);
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
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get(endpoints.NFT_VOLUME.SUMMARY('non-existent-protocol-xyz'));
      expect(response).toBeDefined();
    });
  });
});
