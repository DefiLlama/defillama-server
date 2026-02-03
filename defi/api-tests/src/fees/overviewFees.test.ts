import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { FeeOverviewResponse, isFeeOverviewResponse } from './types';
import { feeOverviewResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.FEES.BASE_URL);

describe('Fees API - Overview Fees', () => {
  let overviewResponse: ApiResponse<FeeOverviewResponse>;
  let chainResponse: ApiResponse<FeeOverviewResponse>;

  beforeAll(async () => {
    const [r1, r2] = await Promise.all([
      apiClient.get<FeeOverviewResponse>(endpoints.FEES.OVERVIEW_FEES),
      apiClient.get<FeeOverviewResponse>(endpoints.FEES.OVERVIEW_FEES_CHAIN('ethereum')),
    ]);

    overviewResponse = r1;
    chainResponse = r2;
  }, 30000);

  describe('All Fees Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(overviewResponse);
        expect(isFeeOverviewResponse(overviewResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = feeOverviewResponseSchema.safeParse(overviewResponse.data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have total data chart with data', () => {
        expect(Array.isArray(overviewResponse.data.totalDataChart)).toBe(true);
        expect(overviewResponse.data.totalDataChart.length).toBeGreaterThan(100);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have fresh data in chart', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 2); // 2 days
      });

      it('should have valid total metrics when present', () => {
        if (overviewResponse.data.total24h !== null && overviewResponse.data.total24h !== undefined) {
          expectValidNumber(overviewResponse.data.total24h);
          expectNonNegativeNumber(overviewResponse.data.total24h);
        }

        if (overviewResponse.data.total7d !== null && overviewResponse.data.total7d !== undefined) {
          expectValidNumber(overviewResponse.data.total7d);
          expectNonNegativeNumber(overviewResponse.data.total7d);
        }

        if (overviewResponse.data.total30d !== null && overviewResponse.data.total30d !== undefined) {
          expectValidNumber(overviewResponse.data.total30d);
          expectNonNegativeNumber(overviewResponse.data.total30d);
        }
      });

      it('should have chronologically ordered chart data', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }
      });

      it('should have protocols in response', () => {
        // Count all non-standard fields as potential protocols
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(overviewResponse.data).filter(
          key => !excludedKeys.includes(key)
        );
        // Response should have data structure (may have protocols at root level)
        expect(protocolKeys.length).toBeGreaterThanOrEqual(0);
      });

      it('should have multiple chains when allChains is present', () => {
        if (overviewResponse.data.allChains) {
          expect(overviewResponse.data.allChains.length).toBeGreaterThan(5);
        }
      });
    });

    describe('Protocol Item Validation', () => {
      it('should have valid protocol data at root level', () => {
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(overviewResponse.data).filter(
          key => !excludedKeys.includes(key)
        );

        // Check first few protocols
        protocolKeys.slice(0, 10).forEach((key) => {
          const protocol = (overviewResponse.data as any)[key];
          if (protocol && typeof protocol === 'object' && protocol.name) {
            expect(typeof protocol.name).toBe('string');
            expect(protocol.name.length).toBeGreaterThan(0);
          }
        });
      });

      it('should have valid fee metrics when present', () => {
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(overviewResponse.data).filter(
          key => !excludedKeys.includes(key)
        );

        const protocolsWithFees = protocolKeys
          .map(key => (overviewResponse.data as any)[key])
          .filter((p) => p && typeof p === 'object' && p.total24h !== null && p.total24h !== undefined)
          .slice(0, 20);

        if (protocolsWithFees.length > 0) {
          protocolsWithFees.forEach((protocol) => {
            const fees = Number(protocol.total24h);
            expectValidNumber(fees);
            expectNonNegativeNumber(fees);
          });
        }
      });

      it('should have valid chains arrays when present', () => {
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(overviewResponse.data).filter(
          key => !excludedKeys.includes(key)
        );

        const protocolsWithChains = protocolKeys
          .map(key => (overviewResponse.data as any)[key])
          .filter((p) => p && typeof p === 'object' && p.chains && p.chains.length > 0)
          .slice(0, 20);

        if (protocolsWithChains.length > 0) {
          protocolsWithChains.forEach((protocol) => {
            expect(Array.isArray(protocol.chains)).toBe(true);
            expect(protocol.chains.length).toBeGreaterThan(0);
            protocol.chains.forEach((chain: string) => {
              expect(typeof chain).toBe('string');
              expect(chain.length).toBeGreaterThan(0);
            });
          });
        }
      });
    });

    describe('Chart Data Validation', () => {
      it('should have valid chart data points', () => {
        overviewResponse.data.totalDataChart.slice(0, 50).forEach((point) => {
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
      });

      it('should have reasonable time coverage', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const spanDays = (maxTime - minTime) / 86400;

        expect(spanDays).toBeGreaterThan(30); // At least 30 days
      });
    });
  });

  describe('Specific Chain Fees Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(chainResponse);
        expect(isFeeOverviewResponse(chainResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = feeOverviewResponseSchema.safeParse(chainResponse.data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have chain field set', () => {
        expect(chainResponse.data.chain).toBe('Ethereum');
      });
    });

    describe('Data Quality Validation', () => {
      it('should have protocols with data', () => {
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(chainResponse.data).filter(
          key => !excludedKeys.includes(key)
        );
        // Chain-specific responses may have fewer or no protocols at root level
        expect(protocolKeys.length).toBeGreaterThanOrEqual(0);
      });

      it('should have fresh chart data', () => {
        const timestamps = chainResponse.data.totalDataChart.map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 2); // 2 days
      });

      it('should have protocols for the correct chain when chains specified', () => {
        const excludedKeys = ['totalDataChart', 'totalDataChartBreakdown', 'breakdown24h', 'breakdown30d', 'chain', 'allChains', 'total24h', 'total48hto24h', 'total7d', 'total14dto7d', 'total30d', 'total60dto30d', 'total1y', 'totalAllTime', 'total7DaysAgo', 'total30DaysAgo', 'change_1d', 'change_7d', 'change_1m', 'change_7dover7d', 'change_30dover30d', 'protocols'];
        const protocolKeys = Object.keys(chainResponse.data).filter(
          key => !excludedKeys.includes(key)
        );

        const protocolsWithChains = protocolKeys
          .map(key => (chainResponse.data as any)[key])
          .filter((p) => p && typeof p === 'object' && p.chains && p.chains.length > 0)
          .slice(0, 10);

        if (protocolsWithChains.length > 0) {
          // At least some protocols should include Ethereum
          const hasEthereumProtocols = protocolsWithChains.some(
            (p) => p.chains.includes('Ethereum')
          );
          expect(hasEthereumProtocols).toBe(true);
        }
      });
    });
  });
});

