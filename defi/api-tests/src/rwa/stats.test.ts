import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaStats } from './types';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
} from '../../utils/testHelpers';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

describe('RWA API - Stats', () => {
  let response: ApiResponse<RwaStats>;

  beforeAll(async () => {
    response = await apiClient.get<RwaStats>(endpoints.RWA.STATS);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response', () => {
      expectSuccessfulResponse(response);
    });

    it('should return an object', () => {
      expectObjectResponse(response);
    });

    it('should have data', () => {
      expect(Object.keys(response.data).length).toBeGreaterThan(0);
    });
  });
});

describe('RWA API - ID Map', () => {
  let response: ApiResponse<Record<string, string | number>>;

  beforeAll(async () => {
    response = await apiClient.get(endpoints.RWA.ID_MAP);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response', () => {
      expectSuccessfulResponse(response);
    });

    it('should return an object with name->id mappings', () => {
      expectObjectResponse(response);
      const keys = Object.keys(response.data);
      expect(keys.length).toBeGreaterThan(0);

      // Validate a sample of entries
      keys.slice(0, 10).forEach((key) => {
        expect(typeof key).toBe('string');
        const value = response.data[key];
        expect(typeof value === 'string' || typeof value === 'number').toBe(true);
      });
    });
  });
});
