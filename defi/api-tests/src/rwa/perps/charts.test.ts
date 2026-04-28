import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import {
  RwaPerpsCurrentResponse,
  RwaPerpsListResponse,
} from './types';
import {
  expectSuccessfulResponse,
  expectValidTimestamp,
} from '../../../utils/testHelpers';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

const METRIC_KEYS = ['openInterest', 'volume24h', 'markets'] as const;
const ALL_BREAKDOWNS = ['venue', 'assetGroup', 'assetClass', 'baseAsset'] as const;
const VENUE_BREAKDOWNS = ['assetGroup', 'assetClass', 'baseAsset'] as const;

describe('RWA Perps API - Chart by ID', () => {
  let currentResponse: ApiResponse<RwaPerpsCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaPerpsCurrentResponse>(endpoints.RWA_PERPS.CURRENT);
  });

  it('should return chart data for a valid market ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);

    const response = await apiClient.get(endpoints.RWA_PERPS.CHART_BY_ID(id));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
      if (response.data.length > 0) {
        expectValidTimestamp(response.data[0].timestamp);
      }
    }
  });

  it('should return 404 for a non-existent market ID', async () => {
    const response = await apiClient.get(
      endpoints.RWA_PERPS.CHART_BY_ID('non-existent-id-99999')
    );
    expect(response.status).toBe(404);
  });
});

describe('RWA Perps API - Chart by Venue', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return chart data for a valid venue', async () => {
    const venues = listResponse.data.venues;
    if (!venues || venues.length === 0) return;

    const venue = venues[0];
    const response = await apiClient.get(endpoints.RWA_PERPS.CHART_BY_VENUE(venue));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });
});

describe('RWA Perps API - Chart by Category', () => {
  let listResponse: ApiResponse<RwaPerpsListResponse>;

  beforeAll(async () => {
    listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
  });

  it('should return chart data for a valid category', async () => {
    const categories = listResponse.data.categories;
    if (!categories || categories.length === 0) return;

    const category = categories[0];
    const response = await apiClient.get(endpoints.RWA_PERPS.CHART_BY_CATEGORY(category));
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });
});

describe('RWA Perps API - Chart Overview Breakdown', () => {
  it('should return overview breakdown for each (key, breakdown) pair on the all target', async () => {
    for (const key of METRIC_KEYS) {
      for (const breakdown of ALL_BREAKDOWNS) {
        const response = await apiClient.get(
          `${endpoints.RWA_PERPS.CHART_OVERVIEW_BREAKDOWN}?key=${key}&breakdown=${breakdown}`
        );
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(Array.isArray(response.data)).toBe(true);
        }
      }
    }
  }, 60000);

  it('should return overview breakdown for a venue target', async () => {
    const listResponse = await apiClient.get<RwaPerpsListResponse>(endpoints.RWA_PERPS.LIST);
    const venues = listResponse.data.venues;
    if (!venues || venues.length === 0) return;

    const venue = venues[0];
    for (const breakdown of VENUE_BREAKDOWNS) {
      const response = await apiClient.get(
        `${endpoints.RWA_PERPS.CHART_OVERVIEW_BREAKDOWN}?venue=${encodeURIComponent(venue)}&key=openInterest&breakdown=${breakdown}`
      );
      expect([200, 404]).toContain(response.status);
    }
  }, 60000);

  it('should reject invalid metric key', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA_PERPS.CHART_OVERVIEW_BREAKDOWN}?key=invalidKey&breakdown=venue`
    );
    expect(response.status).toBe(400);
  });

  it('should reject invalid breakdown for the all target', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA_PERPS.CHART_OVERVIEW_BREAKDOWN}?key=openInterest&breakdown=invalidBreakdown`
    );
    expect(response.status).toBe(400);
  });

  it('should reject when both venue and assetGroup are provided', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA_PERPS.CHART_OVERVIEW_BREAKDOWN}?venue=binance&assetGroup=eth&key=openInterest&breakdown=baseAsset`
    );
    expect(response.status).toBe(400);
  });
});

describe('RWA Perps API - Chart Contract Breakdown', () => {
  it('should return contract breakdown for each metric key on the all target', async () => {
    for (const key of METRIC_KEYS) {
      const response = await apiClient.get(
        `${endpoints.RWA_PERPS.CHART_CONTRACT_BREAKDOWN}?key=${key}`
      );
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      }
    }
  }, 30000);

  it('should reject invalid metric key', async () => {
    const response = await apiClient.get(
      `${endpoints.RWA_PERPS.CHART_CONTRACT_BREAKDOWN}?key=invalidKey`
    );
    expect(response.status).toBe(400);
  });
});
