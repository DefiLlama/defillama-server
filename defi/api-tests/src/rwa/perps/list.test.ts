import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import { RwaPerpsListResponse, isRwaPerpsListResponse } from './types';
import { rwaPerpsListResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectNonEmptyArray,
} from '../../../utils/testHelpers';
import { validate } from '../../../utils/validation';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

describe('RWA Perps API - List', () => {
  let response: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    response = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(response);
      expectObjectResponse(response);
      expect(isRwaPerpsListResponse(response.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(response.data, rwaPerpsListResponseSchema, 'RWA Perps List');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have non-empty contracts array', () => {
      expectNonEmptyArray(response.data.contracts);
    });

    it('should have non-empty venues array', () => {
      expectNonEmptyArray(response.data.venues);
    });

    it('should have non-empty categories array', () => {
      expectNonEmptyArray(response.data.categories);
    });

    it('should have non-empty assetGroups array', () => {
      expectNonEmptyArray(response.data.assetGroups);
    });

    it('should report a positive total market count', () => {
      expect(typeof response.data.total).toBe('number');
      expect(response.data.total).toBeGreaterThan(0);
    });
  });
});
