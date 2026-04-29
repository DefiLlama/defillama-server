import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaCurrentResponse, RwaFilterResponse } from './types';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
} from '../../utils/testHelpers';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

describe('RWA API - Filter by Category', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return RWAs filtered by category', async () => {
    const withCategory = currentResponse.data.find(
      (item) => item.category && item.category.length > 0
    );
    if (!withCategory) return;

    const category = withCategory.category![0];
    const response = await apiClient.get<RwaFilterResponse>(endpoints.RWA.CATEGORY(category));
    expectSuccessfulResponse(response);
    expectObjectResponse(response);
    expect(response.data).toHaveProperty('data');
    expect(Array.isArray(response.data.data)).toBe(true);

    // All returned items should belong to the queried category
    response.data.data.forEach((item) => {
      const categories = (item.category || []).map((c: string) => c.toLowerCase());
      expect(categories).toContain(category.toLowerCase());
    });
  });

  it('should return empty data for non-existent category', async () => {
    const response = await apiClient.get<RwaFilterResponse>(
      endpoints.RWA.CATEGORY('NonExistentCategory12345')
    );
    expectSuccessfulResponse(response);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveLength(0);
  });
});

describe('RWA API - Filter by Chain', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return RWAs filtered by chain', async () => {
    // Find an item that has chain data in onChainMcap
    const withChains = currentResponse.data.find(
      (item) =>
        item.onChainMcap &&
        typeof item.onChainMcap === 'object' &&
        Object.keys(item.onChainMcap).length > 0
    );
    if (!withChains) return;

    const chain = Object.keys(withChains.onChainMcap as Record<string, number>)[0];
    const response = await apiClient.get<RwaFilterResponse>(endpoints.RWA.CHAIN(chain));
    expectSuccessfulResponse(response);
    expectObjectResponse(response);
    expect(response.data).toHaveProperty('data');
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);
  });

  it('should return empty data for non-existent chain', async () => {
    const response = await apiClient.get<RwaFilterResponse>(
      endpoints.RWA.CHAIN('NonExistentChain12345')
    );
    expectSuccessfulResponse(response);
    expect(response.data).toHaveProperty('data');
    expect(response.data.data).toHaveLength(0);
  });
});
