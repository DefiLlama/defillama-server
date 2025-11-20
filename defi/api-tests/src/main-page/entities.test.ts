import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { EntitiesResponse, isEntitiesResponse } from './types';
import { entitiesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Entities', () => {
  let entitiesResponse: ApiResponse<EntitiesResponse>;

  beforeAll(async () => {
    entitiesResponse = await apiClient.get<EntitiesResponse>(
      endpoints.MAIN_PAGE.ENTITIES
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(entitiesResponse);
      expectArrayResponse(entitiesResponse);
      expect(isEntitiesResponse(entitiesResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        entitiesResponse.data,
        entitiesResponseSchema,
        'Entities'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(entitiesResponse.data.length).toBeGreaterThan(0);
    });
  });

  describe('Entity Item Validation', () => {
    it('should have required fields in all entities', () => {
      entitiesResponse.data.slice(0, 20).forEach((entity) => {
        expect(entity).toHaveProperty('name');
        expect(typeof entity.name).toBe('string');
        expect(entity.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid numeric fields when present', () => {
      const entitiesWithData = entitiesResponse.data
        .filter((e) => e.tvl !== undefined)
        .slice(0, 20);

      expect(entitiesWithData.length).toBeGreaterThan(0);

      entitiesWithData.forEach((entity) => {
        if (entity.protocols !== undefined) {
          expectValidNumber(entity.protocols);
          expectNonNegativeNumber(entity.protocols);
        }

        if (entity.tvl !== undefined) {
          expectValidNumber(entity.tvl);
          expectNonNegativeNumber(entity.tvl);
        }
      });
    });

    it('should have valid percentage change fields when present', () => {
      const entitiesWithChange = entitiesResponse.data
        .filter((e) => e.change_1d !== null && e.change_1d !== undefined)
        .slice(0, 20);

      if (entitiesWithChange.length > 0) {
        entitiesWithChange.forEach((entity) => {
          if (entity.change_1h !== null && entity.change_1h !== undefined) {
            expectValidNumber(entity.change_1h);
          }
          if (entity.change_1d !== null && entity.change_1d !== undefined) {
            expectValidNumber(entity.change_1d);
          }
          if (entity.change_7d !== null && entity.change_7d !== undefined) {
            expectValidNumber(entity.change_7d);
          }
        });
      }
    });

    it('should have unique entity names', () => {
      const names = entitiesResponse.data.map((e) => e.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have entities sorted by TVL in descending order', () => {
      const entitiesWithTvl = entitiesResponse.data
        .filter((e) => e.tvl !== undefined)
        .slice(0, 50);

      if (entitiesWithTvl.length > 1) {
        for (let i = 0; i < entitiesWithTvl.length - 1; i++) {
          expect(entitiesWithTvl[i].tvl!).toBeGreaterThanOrEqual(
            entitiesWithTvl[i + 1].tvl!
          );
        }
      }
    });

    it('should have reasonable TVL values', () => {
      const topEntities = entitiesResponse.data
        .filter((e) => e.tvl !== undefined)
        .slice(0, 10);

      topEntities.forEach((entity) => {
        if (entity.tvl !== undefined) {
          expect(entity.tvl).toBeGreaterThan(0);
          expect(entity.tvl).toBeLessThan(1_000_000_000_000);
        }
      });
    });

    it('should have protocol count matching TVL presence', () => {
      const entitiesWithTvl = entitiesResponse.data.filter(
        (e) => e.tvl !== undefined && e.tvl > 0
      );

      entitiesWithTvl.slice(0, 20).forEach((entity) => {
        if (entity.protocols !== undefined) {
          expect(entity.protocols).toBeGreaterThan(0);
        }
      });
    });

    it('should have reasonable protocol counts', () => {
      const entitiesWithProtocols = entitiesResponse.data
        .filter((e) => e.protocols !== undefined)
        .slice(0, 20);

      if (entitiesWithProtocols.length > 0) {
        entitiesWithProtocols.forEach((entity) => {
          expect(entity.protocols!).toBeGreaterThan(0);
          expect(entity.protocols!).toBeLessThan(1000);
        });
      }
    });
  });
});

