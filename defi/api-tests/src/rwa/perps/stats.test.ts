import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import { RwaPerpsIdMap, RwaPerpsStats, isRwaPerpsIdMap } from './types';
import { rwaPerpsIdMapSchema, rwaPerpsStatsSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
} from '../../../utils/testHelpers';
import { validate } from '../../../utils/validation';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

describe('RWA Perps API - Stats', () => {
  let response: ApiResponse<RwaPerpsStats>;

  beforeAll(async () => {
    response = await apiClient.get<RwaPerpsStats>(endpoints.RWA_PERPS.STATS);
  });

  it('should return successful response with object structure', () => {
    expectSuccessfulResponse(response);
    expectObjectResponse(response);
  });

  it('should validate against the (permissive) Zod schema', () => {
    const result = validate(response.data, rwaPerpsStatsSchema, 'RWA Perps Stats');
    expect(result.success).toBe(true);
  });
});

describe('RWA Perps API - ID Map', () => {
  let response: ApiResponse<RwaPerpsIdMap>;

  beforeAll(async () => {
    response = await apiClient.get<RwaPerpsIdMap>(endpoints.RWA_PERPS.ID_MAP);
  });

  it('should return successful response with object structure', () => {
    expectSuccessfulResponse(response);
    expectObjectResponse(response);
    expect(isRwaPerpsIdMap(response.data)).toBe(true);
  });

  it('should validate against Zod schema', () => {
    const result = validate(response.data, rwaPerpsIdMapSchema, 'RWA Perps ID Map');
    expect(result.success).toBe(true);
  });

  it('should have at least one entry', () => {
    expect(Object.keys(response.data).length).toBeGreaterThan(0);
  });
});
