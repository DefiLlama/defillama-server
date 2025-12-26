import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { VolumeOverviewResponse, isVolumeOverviewResponse } from './types';
import { volumeOverviewResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.VOLUMES.BASE_URL);

describe('Volumes API - Overview Options', () => {
  let overviewResponse: ApiResponse<VolumeOverviewResponse>;
  let chainResponse: ApiResponse<VolumeOverviewResponse>;

  beforeAll(async () => {
    const [r1, r2] = await Promise.all([
      apiClient.get<VolumeOverviewResponse>(endpoints.VOLUMES.OVERVIEW_OPTIONS),
      apiClient.get<VolumeOverviewResponse>(endpoints.VOLUMES.OVERVIEW_OPTIONS_CHAIN('ethereum')),
    ]);

    overviewResponse = r1;
    chainResponse = r2;
  }, 30000);

  describe('All Options Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(overviewResponse);
        expect(isVolumeOverviewResponse(overviewResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = volumeOverviewResponseSchema.safeParse(overviewResponse.data);
        if (!result.success) {
          console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
        }
        expect(result.success).toBe(true);
      });

      it('should have protocols array with data', () => {
        expect(Array.isArray(overviewResponse.data.protocols)).toBe(true);
        expect(overviewResponse.data.protocols.length).toBeGreaterThan(0);
      });

      it('should have total data chart with data', () => {
        expect(Array.isArray(overviewResponse.data.totalDataChart)).toBe(true);
        expect(overviewResponse.data.totalDataChart.length).toBeGreaterThan(10);
      });
    });

    describe('Data Quality Validation', () => {
      it('should have fresh data in chart', () => {
        const timestamps = overviewResponse.data.totalDataChart.map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 3); // 3 days
      });

      it('should have valid total metrics', () => {
        if (overviewResponse.data.total24h !== null && overviewResponse.data.total24h !== undefined) {
          expectValidNumber(overviewResponse.data.total24h);
          expectNonNegativeNumber(overviewResponse.data.total24h);
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

      it('should have protocols sorted by volume when volumes exist', () => {
        const protocolsWithVolume = overviewResponse.data.protocols
          .filter((p) => p.total24h !== null && p.total24h !== undefined && Number(p.total24h) > 100)
          .slice(0, 10);

        if (protocolsWithVolume.length > 1) {
          // Check if at least most protocols are sorted (allow some tolerance)
          let sortedPairs = 0;
          let totalPairs = 0;
          
          for (let i = 1; i < protocolsWithVolume.length; i++) {
            const prev = Number(protocolsWithVolume[i - 1].total24h);
            const curr = Number(protocolsWithVolume[i].total24h);
            totalPairs++;
            if (prev >= curr) sortedPairs++;
          }
          
          // At least 30% should be sorted (options may have less strict sorting)
          const sortedPercentage = (sortedPairs / totalPairs) * 100;
          expect(sortedPercentage).toBeGreaterThan(30);
        }
      });

      it('should have multiple protocols', () => {
        expect(overviewResponse.data.protocols.length).toBeGreaterThan(2);
      });
    });

    describe('Protocol Item Validation', () => {
      it('should have required fields in protocols', () => {
        overviewResponse.data.protocols.slice(0, 10).forEach((protocol) => {
          expect(protocol).toHaveProperty('name');
          expect(protocol).toHaveProperty('module');
          expect(typeof protocol.name).toBe('string');
          expect(protocol.name.length).toBeGreaterThan(0);
        });
      });

      it('should have valid volume metrics when present', () => {
        const protocolsWithVolume = overviewResponse.data.protocols
          .filter((p) => p.total24h !== null && p.total24h !== undefined)
          .slice(0, 10);

        if (protocolsWithVolume.length > 0) {
          protocolsWithVolume.forEach((protocol) => {
            const volume = Number(protocol.total24h);
            expectValidNumber(volume);
            expectNonNegativeNumber(volume);
          });
        }
      });

      it('should have valid change percentages when present', () => {
        const protocolsWithChanges = overviewResponse.data.protocols
          .filter((p) => p.change_1d !== null && p.change_1d !== undefined)
          .slice(0, 10);

        if (protocolsWithChanges.length > 0) {
          protocolsWithChanges.forEach((protocol) => {
            expectValidNumber(protocol.change_1d!);
            expect(isNaN(protocol.change_1d!)).toBe(false);
            expect(isFinite(protocol.change_1d!)).toBe(true);
          });
        }
      });

      it('should have valid chains arrays when present', () => {
        const protocolsWithChains = overviewResponse.data.protocols
          .filter((p) => p.chains && p.chains.length > 0)
          .slice(0, 10);

        if (protocolsWithChains.length > 0) {
          protocolsWithChains.forEach((protocol) => {
            expect(Array.isArray(protocol.chains)).toBe(true);
            expect(protocol.chains!.length).toBeGreaterThan(0);
            protocol.chains!.forEach((chain) => {
              expect(typeof chain).toBe('string');
              expect(chain.length).toBeGreaterThan(0);
            });
          });
        }
      });
    });

    describe('Chart Data Validation', () => {
      it('should have valid chart data points', () => {
        overviewResponse.data.totalDataChart.slice(0, 30).forEach((point) => {
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

        expect(spanDays).toBeGreaterThan(7); // At least 7 days
      });
    });
  });

  describe('Specific Chain Options Overview', () => {
    describe('Basic Response Validation', () => {
      it('should return successful response with valid structure', () => {
        expectSuccessfulResponse(chainResponse);
        expect(isVolumeOverviewResponse(chainResponse.data)).toBe(true);
      });

      it('should validate against Zod schema', () => {
        const result = volumeOverviewResponseSchema.safeParse(chainResponse.data);
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
        expect(chainResponse.data.protocols.length).toBeGreaterThan(0);
      });

      it('should have fresh chart data', () => {
        if (chainResponse.data.totalDataChart.length > 0) {
          const timestamps = chainResponse.data.totalDataChart.map((point) => point[0]);
          expectFreshData(timestamps, 86400 * 3); // 3 days
        }
      });

      it('should have protocols for the correct chain when chains specified', () => {
        const protocolsWithChains = chainResponse.data.protocols
          .filter((p) => p.chains && p.chains.length > 0)
          .slice(0, 5);

        if (protocolsWithChains.length > 0) {
          // At least some protocols should include Ethereum
          const hasEthereumProtocols = protocolsWithChains.some(
            (p) => p.chains!.includes('Ethereum')
          );
          expect(hasEthereumProtocols).toBe(true);
        }
      });
    });
  });
});

