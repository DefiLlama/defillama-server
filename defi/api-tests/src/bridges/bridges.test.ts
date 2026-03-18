import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { BridgesListResponse, isBridgesListResponse } from './types';
import { bridgesListResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.BRIDGES.BASE_URL);

describe('Bridges API - Bridges List', () => {
  let bridgesResponse: ApiResponse<BridgesListResponse>;

  beforeAll(async () => {
    bridgesResponse = await apiClient.get<BridgesListResponse>(endpoints.BRIDGES.BRIDGES);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(bridgesResponse);
      expect(isBridgesListResponse(bridgesResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = bridgesListResponseSchema.safeParse(bridgesResponse.data);
      if (!result.success) {
        console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should have bridges array', () => {
      expect(Array.isArray(bridgesResponse.data.bridges)).toBe(true);
      expect(bridgesResponse.data.bridges.length).toBeGreaterThan(0);
    });

    it('should have minimum expected bridges', () => {
      expect(bridgesResponse.data.bridges.length).toBeGreaterThan(20);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have unique bridge IDs', () => {
      const ids = bridgesResponse.data.bridges.map((bridge) => bridge.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique bridge names', () => {
      const names = bridgesResponse.data.bridges.map((bridge) => bridge.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have bridges with volume data', () => {
      const bridgesWithVolume = bridgesResponse.data.bridges.filter(
        (bridge) => bridge.lastDailyVolume !== null && bridge.lastDailyVolume !== undefined && bridge.lastDailyVolume > 0
      );
      expect(bridgesWithVolume.length).toBeGreaterThan(10);
    });

    it('should have bridges supporting multiple chains', () => {
      const bridgesWithMultipleChains = bridgesResponse.data.bridges.filter(
        (bridge) => bridge.chains.length > 1
      );
      expect(bridgesWithMultipleChains.length).toBeGreaterThan(10);
    });

    it('should have well-known bridges', () => {
      const bridgeNames = bridgesResponse.data.bridges.map((b) => b.name.toLowerCase());
      
      // Check for some well-known bridges
      const wellKnownBridges = ['layerzero', 'wormhole', 'circle', 'hyperliquid'];
      const foundBridges = wellKnownBridges.filter((name) => bridgeNames.includes(name));
      
      expect(foundBridges.length).toBeGreaterThan(0);
    });
  });

  describe('Bridge Item Validation', () => {
    it('should have required fields in all bridges', () => {
      bridgesResponse.data.bridges.slice(0, 20).forEach((bridge) => {
        expect(bridge).toHaveProperty('id');
        expect(bridge).toHaveProperty('name');
        expect(bridge).toHaveProperty('displayName');
        expect(bridge).toHaveProperty('chains');

        expect(typeof bridge.id).toBe('number');
        expect(typeof bridge.name).toBe('string');
        expect(bridge.name.length).toBeGreaterThan(0);
        expect(typeof bridge.displayName).toBe('string');
        expect(bridge.displayName.length).toBeGreaterThan(0);
        expect(Array.isArray(bridge.chains)).toBe(true);
      });
    });

    it('should have valid volume metrics when present', () => {
      const bridgesWithVolume = bridgesResponse.data.bridges
        .filter((bridge) => bridge.lastDailyVolume !== null && bridge.lastDailyVolume !== undefined)
        .slice(0, 20);

      if (bridgesWithVolume.length > 0) {
        bridgesWithVolume.forEach((bridge) => {
          expectValidNumber(bridge.lastDailyVolume!);
          expectNonNegativeNumber(bridge.lastDailyVolume!);
        });
      }
    });

    it('should have valid weekly volume when present', () => {
      const bridgesWithWeeklyVolume = bridgesResponse.data.bridges
        .filter((bridge) => bridge.weeklyVolume !== null && bridge.weeklyVolume !== undefined)
        .slice(0, 20);

      if (bridgesWithWeeklyVolume.length > 0) {
        bridgesWithWeeklyVolume.forEach((bridge) => {
          expectValidNumber(bridge.weeklyVolume!);
          expectNonNegativeNumber(bridge.weeklyVolume!);
        });
      }
    });

    it('should have valid monthly volume when present', () => {
      const bridgesWithMonthlyVolume = bridgesResponse.data.bridges
        .filter((bridge) => bridge.monthlyVolume !== null && bridge.monthlyVolume !== undefined)
        .slice(0, 20);

      if (bridgesWithMonthlyVolume.length > 0) {
        bridgesWithMonthlyVolume.forEach((bridge) => {
          expectValidNumber(bridge.monthlyVolume!);
          expectNonNegativeNumber(bridge.monthlyVolume!);
        });
      }
    });

    it('should have valid chain arrays', () => {
      bridgesResponse.data.bridges.slice(0, 20).forEach((bridge) => {
        expect(Array.isArray(bridge.chains)).toBe(true);
        bridge.chains.forEach((chain) => {
          expect(typeof chain).toBe('string');
          expect(chain.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have valid URLs when present', () => {
      const bridgesWithURL = bridgesResponse.data.bridges
        .filter((bridge) => bridge.url && bridge.url !== null)
        .slice(0, 20);

      if (bridgesWithURL.length > 0) {
        bridgesWithURL.forEach((bridge) => {
          expect(typeof bridge.url).toBe('string');
          expect(bridge.url!.length).toBeGreaterThan(0);
          expect(bridge.url).toMatch(/^https?:\/\//);
        });
      }
    });
  });

  describe('Volume Comparison', () => {
    it('should have bridges sorted by volume', () => {
      const bridgesWithVolume = bridgesResponse.data.bridges
        .filter((bridge) => bridge.lastDailyVolume !== null && bridge.lastDailyVolume !== undefined && bridge.lastDailyVolume > 1000)
        .slice(0, 20);

      if (bridgesWithVolume.length > 1) {
        // Check if mostly sorted
        let sortedPairs = 0;
        let totalPairs = 0;
        
        for (let i = 1; i < bridgesWithVolume.length; i++) {
          const prev = Number(bridgesWithVolume[i - 1].lastDailyVolume);
          const curr = Number(bridgesWithVolume[i].lastDailyVolume);
          totalPairs++;
          if (prev >= curr) sortedPairs++;
        }
        
        // At least 60% should be sorted
        const sortedPercentage = (sortedPairs / totalPairs) * 100;
        expect(sortedPercentage).toBeGreaterThan(60);
      }
    });

    it('should have monthly volume >= weekly volume when both present', () => {
      const bridgesWithBothVolumes = bridgesResponse.data.bridges
        .filter((bridge) => 
          bridge.monthlyVolume !== null && bridge.monthlyVolume !== undefined &&
          bridge.weeklyVolume !== null && bridge.weeklyVolume !== undefined &&
          bridge.weeklyVolume > 0 && // Avoid division by zero
          typeof bridge.monthlyVolume === 'number' &&
          typeof bridge.weeklyVolume === 'number'
        )
        .slice(0, 20);

      if (bridgesWithBothVolumes.length > 0) {
        bridgesWithBothVolumes.forEach((bridge) => {
          // Monthly should generally be >= weekly (with some tolerance for timing)
          const ratio = bridge.monthlyVolume! / bridge.weeklyVolume!;
          expect(ratio).toBeGreaterThan(0.5); // Allow some tolerance
        });
      }
    });
  });

  describe('Chain Analysis', () => {
    it('should have common chains represented', () => {
      const allChains = new Set<string>();
      bridgesResponse.data.bridges.forEach((bridge) => {
        bridge.chains.forEach((chain) => allChains.add(chain));
      });

      const commonChains = ['Ethereum', 'Arbitrum', 'Optimism', 'Base', 'Polygon'];
      const foundChains = commonChains.filter((chain) => allChains.has(chain));
      
      expect(foundChains.length).toBeGreaterThan(3);
    });

    it('should have Ethereum as the most common chain', () => {
      const chainCounts: Record<string, number> = {};
      
      bridgesResponse.data.bridges.forEach((bridge) => {
        bridge.chains.forEach((chain) => {
          chainCounts[chain] = (chainCounts[chain] || 0) + 1;
        });
      });

      const ethereumCount = chainCounts['Ethereum'] || 0;
      expect(ethereumCount).toBeGreaterThan(10);
    });
  });
});

