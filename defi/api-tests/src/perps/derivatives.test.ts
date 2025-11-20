import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PerpsOverviewResponse, PerpsSummaryResponse, isPerpsOverviewResponse, isPerpsSummaryResponse } from './types';
import { perpsOverviewResponseSchema, perpsSummaryResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.PERPS.BASE_URL);

describe('Perps API - Derivatives', () => {
  let overviewResponse: ApiResponse<PerpsOverviewResponse>;

  beforeAll(async () => {
    overviewResponse = await apiClient.get<PerpsOverviewResponse>(
      endpoints.PERPS.OVERVIEW_DERIVATIVES
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(overviewResponse);
      expect(isPerpsOverviewResponse(overviewResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        overviewResponse.data,
        perpsOverviewResponseSchema,
        'PerpsOverviewResponse'
      );
      expect(result.success).toBe(true);
    });

    it('should return an object with protocols', () => {
      expect(typeof overviewResponse.data).toBe('object');
      expect(overviewResponse.data).not.toBeNull();
      expect(overviewResponse.data).toHaveProperty('protocols');
    });

    it('should have minimum expected protocols', () => {
      if (overviewResponse.data.protocols) {
        expect(Array.isArray(overviewResponse.data.protocols)).toBe(true);
        expect(overviewResponse.data.protocols.length).toBeGreaterThan(5);
      }
    });

    it('should have aggregated metrics', () => {
      expect(overviewResponse.data).toHaveProperty('total24h');
      if (overviewResponse.data.total24h !== null && overviewResponse.data.total24h !== undefined) {
        expectValidNumber(overviewResponse.data.total24h);
        expectNonNegativeNumber(overviewResponse.data.total24h);
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have protocols sorted by volume', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolsWithVolume = overviewResponse.data.protocols
        .filter((p) => p.total24h !== null && p.total24h !== undefined && p.total24h > 1000)
        .slice(0, 20);

      if (protocolsWithVolume.length > 1) {
        let sortedPairs = 0;
        let totalPairs = 0;
        
        for (let i = 1; i < protocolsWithVolume.length; i++) {
          const prev = Number(protocolsWithVolume[i - 1].total24h);
          const curr = Number(protocolsWithVolume[i].total24h);
          totalPairs++;
          if (prev >= curr) sortedPairs++;
        }
        
        const sortedPercentage = (sortedPairs / totalPairs) * 100;
        expect(sortedPercentage).toBeGreaterThan(50);
      }
    });

    it('should have protocols with data', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolsWithData = overviewResponse.data.protocols.filter(
        (p) => p.total24h !== null && p.total24h !== undefined && p.total24h > 0
      );
      expect(protocolsWithData.length).toBeGreaterThanOrEqual(5);
    });

    it('should have multiple chains represented', () => {
      if (!overviewResponse.data.protocols) return;
      
      const allChains = new Set<string>();
      overviewResponse.data.protocols.forEach((protocol) => {
        if (protocol.chains) {
          protocol.chains.forEach((chain) => allChains.add(chain));
        }
      });
      expect(allChains.size).toBeGreaterThan(3);
    });

    it('should have well-known perps protocols', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolNames = overviewResponse.data.protocols.map((p) => p.name.toLowerCase());
      
      const wellKnownProtocols = ['gmx', 'hyperliquid', 'dydx'];
      const foundProtocols = wellKnownProtocols.filter((name) =>
        protocolNames.some((pName) => pName.includes(name))
      );
      
      expect(foundProtocols.length).toBeGreaterThan(0);
    });
  });

  describe('Protocol Item Validation', () => {
    it('should have required fields in all protocols', () => {
      if (!overviewResponse.data.protocols) return;
      
      overviewResponse.data.protocols.slice(0, 20).forEach((protocol) => {
        expect(protocol).toHaveProperty('name');
        expect(typeof protocol.name).toBe('string');
        expect(protocol.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid volume metrics when present', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolsWithVolume = overviewResponse.data.protocols
        .filter((p) => p.total24h !== null && p.total24h !== undefined)
        .slice(0, 20);

      if (protocolsWithVolume.length > 0) {
        protocolsWithVolume.forEach((protocol) => {
          expectValidNumber(protocol.total24h!);
          expectNonNegativeNumber(protocol.total24h!);
        });
      }
    });

    it('should have valid change percentages when present', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolsWithChange = overviewResponse.data.protocols
        .filter((p) => p.change_1d !== null && p.change_1d !== undefined)
        .slice(0, 20);

      if (protocolsWithChange.length > 0) {
        protocolsWithChange.forEach((protocol) => {
          expectValidNumber(protocol.change_1d!);
          expect(protocol.change_1d).toBeGreaterThanOrEqual(-100);
          expect(protocol.change_1d).toBeLessThan(10000); // Some protocols can have very high growth
        });
      }
    });

    it('should have valid chart data when present', () => {
      if (!overviewResponse.data.protocols) return;
      
      const protocolsWithChart = overviewResponse.data.protocols
        .filter((p) => p.totalDataChart && p.totalDataChart.length > 0)
        .slice(0, 5);

      if (protocolsWithChart.length > 0) {
        protocolsWithChart.forEach((protocol) => {
          expect(Array.isArray(protocol.totalDataChart)).toBe(true);
          expect(protocol.totalDataChart!.length).toBeGreaterThan(0);
          
          protocol.totalDataChart!.slice(0, 5).forEach(([timestamp, value]) => {
            expectValidNumber(timestamp);
            expectValidNumber(value);
            expect(timestamp).toBeGreaterThan(0);
          });
        });
      }
    });
  });
});

describe('Perps API - Summary', () => {
  const testProtocols = ['gmx', 'hyperliquid', 'dydx'];
  const responses: Record<string, ApiResponse<PerpsSummaryResponse>> = {};

  beforeAll(async () => {
    const results = await Promise.all(
      testProtocols.map((protocol) =>
        apiClient.get<PerpsSummaryResponse>(endpoints.PERPS.SUMMARY_DERIVATIVES(protocol))
      )
    );

    testProtocols.forEach((protocol, index) => {
      responses[protocol] = results[index];
    });
  }, 90000);

  testProtocols.forEach((protocol) => {
    describe(`Protocol: ${protocol}`, () => {
      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          const response = responses[protocol];
          expectSuccessfulResponse(response);
          expect(isPerpsSummaryResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = responses[protocol];
          const result = validate(
            response.data,
            perpsSummaryResponseSchema,
            `PerpsSummary-${protocol}`
          );
          expect(result.success).toBe(true);
        });

        it('should have protocol name', () => {
          const response = responses[protocol];
          expect(response.data).toHaveProperty('name');
          expect(typeof response.data.name).toBe('string');
          expect(response.data.name.length).toBeGreaterThan(0);
        });

        it('should have at least one chain', () => {
          const response = responses[protocol];
          if (response.data.chains) {
            expect(Array.isArray(response.data.chains)).toBe(true);
            expect(response.data.chains.length).toBeGreaterThan(0);
          }
        });
      });

      describe('Metrics Validation', () => {
        it('should have valid volume metrics when present', () => {
          const response = responses[protocol];
          const data = response.data;

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

        it('should have valid change percentage when present', () => {
          const response = responses[protocol];
          const data = response.data;

          if (data.change_1d !== null && data.change_1d !== undefined) {
            expectValidNumber(data.change_1d);
            expect(data.change_1d).toBeGreaterThan(-100);
            expect(data.change_1d).toBeLessThan(1000);
          }
        });
      });

      describe('Chart Data Validation', () => {
        it('should have chart data when present', () => {
          const response = responses[protocol];
          const data = response.data;

          if (data.totalDataChart) {
            expect(Array.isArray(data.totalDataChart)).toBe(true);
            expect(data.totalDataChart.length).toBeGreaterThan(0);
          }
        });

        it('should have chronologically ordered chart data when present', () => {
          const response = responses[protocol];
          const data = response.data;

          if (data.totalDataChart && data.totalDataChart.length > 1) {
            for (let i = 1; i < data.totalDataChart.length; i++) {
              expect(data.totalDataChart[i][0]).toBeGreaterThanOrEqual(
                data.totalDataChart[i - 1][0]
              );
            }
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get(endpoints.PERPS.SUMMARY_DERIVATIVES('non-existent-protocol-xyz'));
      
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 30000);
  });
});

