import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaCurrentResponse, RwaIdMap, RwaListResponse } from './types';
import {
  expectSuccessfulResponse,
  expectNonEmptyArray,
  expectValidTimestamp,
} from '../../utils/testHelpers';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

// Asset-breakdown endpoints return { [metricKey]: Array<{timestamp, ...assets}> }
function expectAssetBreakdownShape(data: any) {
  expect(typeof data).toBe('object');
  expect(data).not.toBeNull();
  expect(Array.isArray(data)).toBe(false);

  const arrayValuedKeys = Object.keys(data).filter((k) => Array.isArray(data[k]));
  expect(arrayValuedKeys.length).toBeGreaterThan(0);
}

describe('RWA API - Chart by ID', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return chart data for a valid RWA ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const response = await apiClient.get(endpoints.RWA.CHART_BY_ID(id));
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_BY_ID('non-existent-id-99999'));
    expect(response.status).toBe(404);
  });
});

describe('RWA API - Chart by Name', () => {
  let idMapResponse: ApiResponse<RwaIdMap>;

  beforeAll(async () => {
    idMapResponse = await apiClient.get<RwaIdMap>(endpoints.RWA.ID_MAP);
  });

  it('should return chart data for a valid RWA name', async () => {
    const names = Object.keys(idMapResponse.data);
    expect(names.length).toBeGreaterThan(0);

    const firstName = names[0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_NAME(firstName));
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should return 404 for non-existent name', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_BY_NAME('NonExistentRWAName12345'));
    expect(response.status).toBe(404);
  });
});

describe('RWA API - Breakdown Charts', () => {
  it('should return chain breakdown chart data', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_CHAIN_BREAKDOWN);
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should return category breakdown chart data', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_CATEGORY_BREAKDOWN);
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should return platform breakdown chart data', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_PLATFORM_BREAKDOWN);
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should return assetGroup breakdown chart data', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_ASSET_GROUP_BREAKDOWN);
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should support key query parameter', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA.CHART_CHAIN_BREAKDOWN}?key=activeMcap`
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should support includeStablecoin query parameter', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA.CHART_CHAIN_BREAKDOWN}?includeStablecoin=true`
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should support includeGovernance query parameter', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA.CHART_CHAIN_BREAKDOWN}?includeGovernance=true`
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should support both include flags', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA.CHART_CHAIN_BREAKDOWN}?includeStablecoin=true&includeGovernance=true`
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

describe('RWA API - Chart by Chain', () => {
  it('should return chart data for Ethereum', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_BY_CHAIN('Ethereum'));
    // May be 404 if no data for this chain, which is acceptable
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  it('should return chain asset-breakdown chart data', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_BY_CHAIN_ASSET_BREAKDOWN('Ethereum'));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expectAssetBreakdownShape(response.data);
    }
  });
});

describe('RWA API - Chart by Category', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return chart data for a valid category', async () => {
    const withCategory = currentResponse.data.find(
      (item) => item.category && item.category.length > 0
    );
    if (!withCategory) return;

    const category = withCategory.category![0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_CATEGORY(category));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  it('should return category asset-breakdown chart data', async () => {
    const withCategory = currentResponse.data.find(
      (item) => item.category && item.category.length > 0
    );
    if (!withCategory) return;

    const category = withCategory.category![0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_CATEGORY_ASSET_BREAKDOWN(category));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expectAssetBreakdownShape(response.data);
    }
  });
});

describe('RWA API - Chart by Platform', () => {
  let listResponse: ApiResponse<RwaListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaListResponse>(endpoints.RWA.LIST);
  });

  it('should return chart data for a valid platform', async () => {
    const platforms = listResponse.data.platforms;
    if (!platforms || platforms.length === 0) return;

    const platform = platforms[0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_PLATFORM(platform));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  it('should return platform asset-breakdown chart data', async () => {
    const platforms = listResponse.data.platforms;
    if (!platforms || platforms.length === 0) return;

    const platform = platforms[0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_PLATFORM_ASSET_BREAKDOWN(platform));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expectAssetBreakdownShape(response.data);
    }
  });
});

describe('RWA API - Chart by Asset Group', () => {
  let listResponse: ApiResponse<RwaListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaListResponse>(endpoints.RWA.LIST);
  });

  it('should return chart data for a valid assetGroup', async () => {
    const assetGroups = listResponse.data.assetGroups;
    if (!assetGroups || assetGroups.length === 0) return;

    const assetGroup = assetGroups[0];
    const response = await apiClient.get(endpoints.RWA.CHART_BY_ASSET_GROUP(assetGroup));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  it('should return assetGroup asset-breakdown chart data', async () => {
    const assetGroups = listResponse.data.assetGroups;
    if (!assetGroups || assetGroups.length === 0) return;

    const assetGroup = assetGroups[0];
    const response = await apiClient.get(
      endpoints.RWA.CHART_BY_ASSET_GROUP_ASSET_BREAKDOWN(assetGroup)
    );
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expectAssetBreakdownShape(response.data);
    }
  });
});

describe('RWA API - Chart Asset', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return asset chart data for a valid ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const response = await apiClient.get(endpoints.RWA.CHART_ASSET(id));
    // May be 404 if no pg-cache data, which is acceptable
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
      if (response.data.length > 0) {
        expectValidTimestamp(response.data[0].timestamp);
      }
    }
  });

  it('should return 404 for non-existent asset ID', async () => {
    const response = await apiClient.get(endpoints.RWA.CHART_ASSET('non-existent-asset-99999'));
    expect(response.status).toBe(404);
  });
});
