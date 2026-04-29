import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaListResponse, isRwaListResponse } from './types';
import { rwaListResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectNonEmptyArray,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

describe('RWA API - List', () => {
  let response: ApiResponse<RwaListResponse>;

  beforeAll(async () => {
    response = await apiClient.get<RwaListResponse>(endpoints.RWA.LIST);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(response);
      expectObjectResponse(response);
      expect(isRwaListResponse(response.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(response.data, rwaListResponseSchema, 'RWA List');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have non-empty canonicalMarketIds array', () => {
      expectNonEmptyArray(response.data.canonicalMarketIds);
      response.data.canonicalMarketIds.slice(0, 10).forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty platforms array', () => {
      expectNonEmptyArray(response.data.platforms);
    });

    it('should have non-empty chains array', () => {
      expectNonEmptyArray(response.data.chains);
    });

    it('should have non-empty categories array', () => {
      expectNonEmptyArray(response.data.categories);
    });

    it('should have non-empty assetGroups array', () => {
      expectNonEmptyArray(response.data.assetGroups);
    });

    it('should have non-empty idMap', () => {
      const keys = Object.keys(response.data.idMap);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});
