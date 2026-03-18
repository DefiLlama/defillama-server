import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { PerpsResponse, isPerpsResponse } from './types';
import { perpsResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.YIELDS_PRO.BASE_URL);

describe('Yields Pro API - Perps', () => {
  let perpsResponse: ApiResponse<PerpsResponse>;

  beforeAll(async () => {
    perpsResponse = await apiClient.get<PerpsResponse>(endpoints.YIELDS_PRO.PERPS);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(perpsResponse);
      expect(perpsResponse.data).toHaveProperty('status');
      expect(perpsResponse.data).toHaveProperty('data');
      expect(perpsResponse.data.status).toBe('success');
      expect(Array.isArray(perpsResponse.data.data)).toBe(true);
      expect(isPerpsResponse(perpsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(perpsResponse.data, perpsResponseSchema, 'Perps');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(perpsResponse.data.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected perps', () => {
      expect(perpsResponse.data.data.length).toBeGreaterThan(10);
    });
  });

  describe('Perp Item Validation', () => {
    it('should have required fields in all perps', () => {
      perpsResponse.data.data.slice(0, 20).forEach((perp) => {
        expect(perp).toHaveProperty('perp_id');
        expect(perp).toHaveProperty('timestamp');
        expect(perp).toHaveProperty('marketplace');
        expect(perp).toHaveProperty('market');
        expect(perp).toHaveProperty('baseAsset');

        expect(typeof perp.perp_id).toBe('string');
        expect(typeof perp.timestamp).toBe('string');
        expect(typeof perp.marketplace).toBe('string');
        expect(typeof perp.market).toBe('string');
        expect(typeof perp.baseAsset).toBe('string');
        
        if (perp.quoteAsset !== undefined) {
          expect(typeof perp.quoteAsset).toBe('string');
        }
      });
    });

    it('should have valid timestamp format', () => {
      perpsResponse.data.data.slice(0, 20).forEach((perp) => {
        expect(() => new Date(perp.timestamp)).not.toThrow();
        const date = new Date(perp.timestamp);
        expect(date.getTime()).toBeGreaterThan(0);
      });
    });

    it('should have valid funding rate when present', () => {
      const perpsWithFunding = perpsResponse.data.data
        .filter((perp) => perp.fundingRate !== null && perp.fundingRate !== undefined)
        .slice(0, 20);

      if (perpsWithFunding.length > 0) {
        perpsWithFunding.forEach((perp) => {
          expectValidNumber(perp.fundingRate!);
          expect(perp.fundingRate!).toBeGreaterThan(-100);
          expect(perp.fundingRate!).toBeLessThan(100);
        });
      }
    });

    it('should have valid open interest when present', () => {
      const perpsWithOI = perpsResponse.data.data
        .filter((perp) => perp.openInterest !== null && perp.openInterest !== undefined)
        .slice(0, 20);

      if (perpsWithOI.length > 0) {
        perpsWithOI.forEach((perp) => {
          expectValidNumber(perp.openInterest!);
          expect(perp.openInterest!).toBeGreaterThan(0);
        });
      }
    });

    it('should have valid volume when present', () => {
      const perpsWithVolume = perpsResponse.data.data
        .filter((perp) => perp.volume !== null && perp.volume !== undefined)
        .slice(0, 20);

      if (perpsWithVolume.length > 0) {
        perpsWithVolume.forEach((perp) => {
          expectValidNumber(perp.volume!);
          expect(perp.volume!).toBeGreaterThan(0);
        });
      }
    });

    it('should have valid perp IDs', () => {
      perpsResponse.data.data.slice(0, 20).forEach((perp) => {
        expect(perp.perp_id).toMatch(/^[a-zA-Z0-9\-]+$/);
      });
    });
  });

  describe('Data Quality Validation', () => {
    it('should have perps from multiple marketplaces', () => {
      const marketplaces = new Set(perpsResponse.data.data.map((perp) => perp.marketplace));
      expect(marketplaces.size).toBeGreaterThan(1);
    });

    it('should have perps for multiple markets', () => {
      const markets = new Set(perpsResponse.data.data.map((perp) => perp.market));
      expect(markets.size).toBeGreaterThan(5);
    });

    it('should have unique perp IDs', () => {
      const perpIds = perpsResponse.data.data.map((perp) => perp.perp_id);
      const uniqueIds = new Set(perpIds);
      expect(uniqueIds.size).toBe(perpIds.length);
    });

    it('should have perps with recent timestamps', () => {
      const recentTimestamps = perpsResponse.data.data.filter((perp) => {
        const date = new Date(perp.timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        return diff < 86400000 * 7; // Within 7 days
      });

      expect(recentTimestamps.length).toBeGreaterThan(0);
    });
  });
});

