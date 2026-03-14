import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { NewUsersOverviewResponse, isNewUsersOverviewResponse } from './types';
import { newUsersOverviewResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.NEW_USERS_DIM.BASE_URL);

describe('New Users API - Overview', () => {
  let overviewResponse: ApiResponse<NewUsersOverviewResponse>;
  let chainResponse: ApiResponse<NewUsersOverviewResponse>;

  beforeAll(async () => {
    const [r1, r2] = await Promise.all([
      apiClient.get<NewUsersOverviewResponse>(endpoints.NEW_USERS_DIM.OVERVIEW),
      apiClient.get<NewUsersOverviewResponse>(endpoints.NEW_USERS_DIM.OVERVIEW_CHAIN('ethereum')),
    ]);

    overviewResponse = r1;
    chainResponse = r2;
  }, 30000);

  describe('All New Users Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(overviewResponse);
        expect(isNewUsersOverviewResponse(overviewResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = newUsersOverviewResponseSchema.safeParse(overviewResponse.data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have total data chart with data', () => {
        expect(Array.isArray(overviewResponse.data.totalDataChart)).toBe(true);
        expect(overviewResponse.data.totalDataChart.length).toBeGreaterThan(10);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have fresh data in chart', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 3);
      });

      it('should have valid total metrics when present', () => {
        if (overviewResponse.data.total24h !== null && overviewResponse.data.total24h !== undefined) {
          expectValidNumber(overviewResponse.data.total24h);
          expectNonNegativeNumber(overviewResponse.data.total24h);
          expect(overviewResponse.data.total24h).toBeGreaterThan(0);
        }

        if (overviewResponse.data.total7d !== null && overviewResponse.data.total7d !== undefined) {
          expectValidNumber(overviewResponse.data.total7d);
          expectNonNegativeNumber(overviewResponse.data.total7d);
        }
      });

      it('should have chronologically ordered chart data', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);

        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }
      });

      it('should have multiple chains when allChains is present', () => {
        if (overviewResponse.data.allChains) {
          expect(overviewResponse.data.allChains.length).toBeGreaterThan(1);
        }
      });
    });

    describe('Protocol Item Validation', () => {
      it('should have protocols with data when present', () => {
        if (!overviewResponse.data.protocols) return;

        expect(Array.isArray(overviewResponse.data.protocols)).toBe(true);
        expect(overviewResponse.data.protocols.length).toBeGreaterThan(0);
      });

      it('should have required fields in protocols', () => {
        if (!overviewResponse.data.protocols) return;

        overviewResponse.data.protocols.slice(0, 20).forEach((protocol) => {
          expect(protocol).toHaveProperty('name');
          expect(typeof protocol.name).toBe('string');
          expect(protocol.name.length).toBeGreaterThan(0);
        });
      });

      it('should have valid user count metrics when present', () => {
        if (!overviewResponse.data.protocols) return;

        const protocolsWithData = overviewResponse.data.protocols
          .filter((p) => p.total24h !== null && p.total24h !== undefined)
          .slice(0, 20);

        if (protocolsWithData.length > 0) {
          protocolsWithData.forEach((protocol) => {
            const count = Number(protocol.total24h);
            expectValidNumber(count);
            expectNonNegativeNumber(count);
          });
        }
      });
    });

    describe('Chart Data Validation', () => {
      it('should have valid chart data points', () => {
        overviewResponse.data.totalDataChart.slice(0, 50).forEach((point) => {
          expect(Array.isArray(point)).toBe(true);
          expect(point.length).toBe(2);

          expectValidNumber(point[0]);
          expect(point[0]).toBeGreaterThan(1400000000);

          const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
          expectValidNumber(value);
          expectNonNegativeNumber(value);
        });
      });

      it('should have reasonable time coverage', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const spanDays = (maxTime - minTime) / 86400;

        expect(spanDays).toBeGreaterThan(30);
      });
    });
  });

  describe('Chain-specific New Users Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(chainResponse);
        expect(isNewUsersOverviewResponse(chainResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = newUsersOverviewResponseSchema.safeParse(chainResponse.data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have total data chart', () => {
        expect(Array.isArray(chainResponse.data.totalDataChart)).toBe(true);
        expect(chainResponse.data.totalDataChart.length).toBeGreaterThan(0);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have fresh data in chart', () => {
        const timestamps = chainResponse.data.totalDataChart.map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 3);
      });

      it('should have chronologically ordered chart data', () => {
        const timestamps = chainResponse.data.totalDataChart.map((point) => point[0]);

        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }
      });
    });
  });
});
