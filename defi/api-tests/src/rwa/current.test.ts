import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaCurrentResponse, isRwaCurrentResponse } from './types';
import { rwaCurrentResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectNonEmptyArray,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

describe('RWA API - Current', () => {
  let response: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    response = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(response);
      expect(Array.isArray(response.data)).toBe(true);
      expect(isRwaCurrentResponse(response.data)).toBe(true);
      expectNonEmptyArray(response.data);
    });

    it('should validate against Zod schema', () => {
      const result = validate(response.data, rwaCurrentResponseSchema, 'RWA Current');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have required fields in all items', () => {
      response.data.slice(0, 10).forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('assetName');
        expectNonEmptyString(item.assetName);
      });
    });

    it('should have unique IDs', () => {
      const ids = response.data.map((item) => String(item.id));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Data Validation', () => {
    it('should have valid category arrays when present', () => {
      const withCategory = response.data.filter((item) => item.category && item.category.length > 0);
      withCategory.slice(0, 10).forEach((item) => {
        expect(Array.isArray(item.category)).toBe(true);
        item.category!.forEach((cat) => {
          expect(typeof cat).toBe('string');
        });
      });
    });

    it('should have valid onChainMcap values when present', () => {
      response.data.slice(0, 10).forEach((item) => {
        if (item.onChainMcap && typeof item.onChainMcap === 'object') {
          Object.entries(item.onChainMcap).forEach(([chain, value]) => {
            expect(typeof chain).toBe('string');
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });

    it('should have valid defiActiveTvl nested structure when present', () => {
      const withTvl = response.data.filter(
        (item) => item.defiActiveTvl && Object.keys(item.defiActiveTvl).length > 0
      );
      withTvl.slice(0, 5).forEach((item) => {
        Object.entries(item.defiActiveTvl!).forEach(([chain, protocols]) => {
          expect(typeof chain).toBe('string');
          expect(typeof protocols).toBe('object');
          Object.entries(protocols).forEach(([protocol, value]) => {
            expect(typeof protocol).toBe('string');
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(0);
          });
        });
      });
    });
  });
});

describe('RWA API - RWA by ID', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return a specific RWA by ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const response = await apiClient.get(endpoints.RWA.RWA_BY_ID(id));
    expectSuccessfulResponse(response);
    expect(response.data).toHaveProperty('id');
    expect(String(response.data.id).toLowerCase()).toBe(id.toLowerCase());
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await apiClient.get(endpoints.RWA.RWA_BY_ID('non-existent-rwa-id-12345'));
    expect(response.status).toBe(404);
  });
});

describe('RWA API - Asset by Ticker', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return a specific RWA by ticker', async () => {
    const withTicker = currentResponse.data.find((item) => item.ticker);
    if (!withTicker) return;

    const response = await apiClient.get(endpoints.RWA.ASSET_BY_TICKER(withTicker.ticker!));
    expectSuccessfulResponse(response);
    expect(response.data).toHaveProperty('assetName');
  });

  it('should return 404 for non-existent ticker', async () => {
    const response = await apiClient.get(endpoints.RWA.ASSET_BY_TICKER('ZZZZNONEXISTENT'));
    expect(response.status).toBe(404);
  });
});
