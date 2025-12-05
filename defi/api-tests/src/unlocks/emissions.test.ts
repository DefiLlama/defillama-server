import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { EmissionsResponse, isEmissionsResponse } from './types';
import { emissionsResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.UNLOCKS.BASE_URL);

describe('Unlocks API - Emissions', () => {
  let emissionsResponse: ApiResponse<EmissionsResponse>;

  beforeAll(async () => {
    emissionsResponse = await apiClient.get<EmissionsResponse>(
      endpoints.UNLOCKS.EMISSIONS
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(emissionsResponse);
      expectArrayResponse(emissionsResponse);
      expect(isEmissionsResponse(emissionsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        emissionsResponse.data,
        emissionsResponseSchema,
        'Emissions'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(emissionsResponse.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected protocols', () => {
      expect(emissionsResponse.data.length).toBeGreaterThan(10);
    });
  });

  describe('Emission Item Validation', () => {
    it('should have required fields in all items', () => {
      emissionsResponse.data.slice(0, 20).forEach((item) => {
        expect(item).toHaveProperty('token');
        expect(item).toHaveProperty('protocolId');
        expect(item).toHaveProperty('name');
        
        expect(typeof item.token).toBe('string');
        expect(typeof item.protocolId).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid sources array when present', () => {
      const itemsWithSources = emissionsResponse.data
        .filter((item) => item.sources !== undefined)
        .slice(0, 20);

      if (itemsWithSources.length > 0) {
        itemsWithSources.forEach((item) => {
          expect(Array.isArray(item.sources)).toBe(true);
          if (item.sources && item.sources.length > 0) {
            item.sources.forEach((source) => {
              expect(typeof source).toBe('string');
            });
          }
        });
      }
    });

    it('should have valid numeric fields when present', () => {
      const itemsWithData = emissionsResponse.data
        .filter((item) => item.circSupply !== undefined)
        .slice(0, 20);

      expect(itemsWithData.length).toBeGreaterThan(0);

      itemsWithData.forEach((item) => {
        if (item.circSupply !== undefined) {
          expectValidNumber(item.circSupply);
          expectNonNegativeNumber(item.circSupply);
        }

        if (item.circSupply30d !== undefined) {
          expectValidNumber(item.circSupply30d);
          expectNonNegativeNumber(item.circSupply30d);
        }

        if (item.totalLocked !== undefined) {
          expectValidNumber(item.totalLocked);
          expectNonNegativeNumber(item.totalLocked);
        }

        if (item.mcap !== undefined) {
          expectValidNumber(item.mcap);
          expectNonNegativeNumber(item.mcap);
        }

        if (item.maxSupply !== undefined) {
          expectValidNumber(item.maxSupply);
          expectNonNegativeNumber(item.maxSupply);
        }

        if (item.unlockedPct !== undefined) {
          expectValidNumber(item.unlockedPct);
          expect(item.unlockedPct).toBeGreaterThanOrEqual(0);
          expect(item.unlockedPct).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should have valid nextEvent when present', () => {
      const itemsWithNextEvent = emissionsResponse.data
        .filter((item) => item.nextEvent !== undefined)
        .slice(0, 20);

      if (itemsWithNextEvent.length > 0) {
        itemsWithNextEvent.forEach((item) => {
          const eventTime = item.nextEvent!.timestamp || item.nextEvent!.date;
          expect(eventTime).toBeDefined();
          expect(typeof eventTime).toBe('number');
          expect(eventTime!).toBeGreaterThan(0);

          if (item.nextEvent!.noOfTokens !== undefined) {
            expectValidNumber(item.nextEvent!.noOfTokens);
          }

          if (item.nextEvent!.toUnlock !== undefined) {
            expectValidNumber(item.nextEvent!.toUnlock);
          }

          if (item.nextEvent!.proportion !== undefined) {
            expectValidNumber(item.nextEvent!.proportion);
          }
        });
      }
    });

    it('should have valid token field format', () => {
      emissionsResponse.data.slice(0, 20).forEach((item) => {
        // Token can be in formats: "chain:0xaddress" or "coingecko:symbol"
        // SUI addresses can contain :: so we need to allow multiple colons in the address part
        expect(item.token).toMatch(/^[\w-]+:.+$/);
        expect(item.token.split(':').length).toBeGreaterThanOrEqual(2);
        
        // Check that there's at least a chain and an address/id part
        const parts = item.token.split(':');
        expect(parts[0].length).toBeGreaterThan(0); // Chain part
        expect(parts.slice(1).join(':').length).toBeGreaterThan(0); // Address/ID part (may contain colons)
      });
    });

    it('should have unique protocol IDs', () => {
      const protocolIds = emissionsResponse.data.map((item) => item.protocolId);
      const uniqueIds = new Set(protocolIds);
      expect(uniqueIds.size).toBe(protocolIds.length);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have items with circulating supply data', () => {
      const itemsWithCircSupply = emissionsResponse.data.filter(
        (item) => item.circSupply !== undefined && item.circSupply > 0
      );

      expect(itemsWithCircSupply.length).toBeGreaterThan(0);
    });

    it('should have items with locked tokens', () => {
      const itemsWithLocked = emissionsResponse.data.filter(
        (item) => item.totalLocked !== undefined && item.totalLocked > 0
      );

      expect(itemsWithLocked.length).toBeGreaterThan(0);
    });

    it('should have items with upcoming events', () => {
      const itemsWithEvents = emissionsResponse.data.filter(
        (item) => item.nextEvent !== undefined
      );

      // Not all protocols may have upcoming events
      if (itemsWithEvents.length > 0) {
        const eventTime = itemsWithEvents[0].nextEvent!.timestamp || itemsWithEvents[0].nextEvent!.date;
        expect(eventTime).toBeDefined();
        expect(eventTime!).toBeGreaterThan(
          Math.floor(Date.now() / 1000) - 86400 * 365 // Within reasonable range
        );
      }
    });

    it('should have reasonable circulating supply changes', () => {
      const itemsWithBothSupplies = emissionsResponse.data.filter(
        (item) =>
          item.circSupply !== undefined &&
          item.circSupply30d !== undefined &&
          item.circSupply > 0 &&
          item.circSupply30d > 0
      );

      if (itemsWithBothSupplies.length > 0) {
        itemsWithBothSupplies.slice(0, 10).forEach((item) => {
          // Supply should be in reasonable range (not changed by more than 10x in 30 days)
          const ratio = item.circSupply! / item.circSupply30d!;
          expect(ratio).toBeGreaterThan(0.1);
          expect(ratio).toBeLessThan(10);
        });
      }
    });
  });
});
