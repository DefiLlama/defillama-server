import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import {
  RwaPerpsFilterResponse,
  RwaPerpsListResponse,
} from './types';
import { rwaPerpsFilterResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectNonEmptyArray,
} from '../../../utils/testHelpers';
import { validate } from '../../../utils/validation';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

describe('RWA Perps API - Filter by Contract', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return markets matching a known contract', async () => {
    const contracts = listResponse.data.contracts;
    if (!contracts || contracts.length === 0) return;

    const contract = contracts[0];
    const response = await apiClient.get<RwaPerpsFilterResponse>(
      endpoints.RWA_PERPS.CONTRACT(contract)
    );
    expectSuccessfulResponse(response);
    expectNonEmptyArray(response.data);

    const result = validate(response.data, rwaPerpsFilterResponseSchema, 'RWA Perps Contract');
    expect(result.success).toBe(true);
  });

  it('should return 404 for an unknown contract', async () => {
    const response = await apiClient.get(
      endpoints.RWA_PERPS.CONTRACT('non-existent-contract-99999')
    );
    expect(response.status).toBe(404);
  });
});

describe('RWA Perps API - Filter by Venue', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return markets matching a known venue', async () => {
    const venues = listResponse.data.venues;
    if (!venues || venues.length === 0) return;

    const venue = venues[0];
    const response = await apiClient.get<RwaPerpsFilterResponse>(
      endpoints.RWA_PERPS.VENUE(venue)
    );
    expectSuccessfulResponse(response);
    expectNonEmptyArray(response.data);
  });

  it('should return 404 for an unknown venue', async () => {
    const response = await apiClient.get(
      endpoints.RWA_PERPS.VENUE('non-existent-venue-99999')
    );
    expect(response.status).toBe(404);
  });
});

describe('RWA Perps API - Filter by Category', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return markets matching a known category', async () => {
    const categories = listResponse.data.categories;
    if (!categories || categories.length === 0) return;

    const category = categories[0];
    const response = await apiClient.get<RwaPerpsFilterResponse>(
      endpoints.RWA_PERPS.CATEGORY(category)
    );
    expectSuccessfulResponse(response);
    expectNonEmptyArray(response.data);
  });

  it('should return 404 for an unknown category', async () => {
    const response = await apiClient.get(
      endpoints.RWA_PERPS.CATEGORY('non-existent-category-99999')
    );
    expect(response.status).toBe(404);
  });
});

describe('RWA Perps API - Filter by Asset Group', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return markets matching a known assetGroup', async () => {
    const assetGroups = listResponse.data.assetGroups;
    if (!assetGroups || assetGroups.length === 0) return;

    const assetGroup = assetGroups[0];
    const response = await apiClient.get<RwaPerpsFilterResponse>(
      endpoints.RWA_PERPS.ASSET_GROUP(assetGroup)
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should succeed with an empty array for an unknown assetGroup', async () => {
    // Per server.ts, /assetGroup never 404s — it just returns the (possibly empty) filtered list
    const response = await apiClient.get<RwaPerpsFilterResponse>(
      endpoints.RWA_PERPS.ASSET_GROUP('NonExistentAssetGroup12345')
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toHaveLength(0);
  });
});
