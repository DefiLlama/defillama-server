import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import {
  RwaPerpsCurrentResponse,
  RwaPerpsMarket,
  isRwaPerpsCurrentResponse,
} from './types';
import { rwaPerpsCurrentResponseSchema, rwaPerpsMarketSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectNonEmptyArray,
} from '../../../utils/testHelpers';
import { validate } from '../../../utils/validation';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

describe('RWA Perps API - Current', () => {
  let response: ApiResponse<RwaPerpsCurrentResponse>;

  beforeAll(async () => {
    response = await apiClient.get<RwaPerpsCurrentResponse>(endpoints.RWA_PERPS.CURRENT);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with array of markets', () => {
      expectSuccessfulResponse(response);
      expect(isRwaPerpsCurrentResponse(response.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(response.data, rwaPerpsCurrentResponseSchema, 'RWA Perps Current');
      expect(result.success).toBe(true);
    });

    it('should have at least one market', () => {
      expectNonEmptyArray(response.data);
    });
  });

  describe('Data Quality', () => {
    it('should sort markets by openInterest descending', () => {
      const ois = response.data
        .slice(0, 20)
        .map((m) => Number(m.openInterest || 0));
      for (let i = 1; i < ois.length; i++) {
        expect(ois[i - 1]).toBeGreaterThanOrEqual(ois[i]);
      }
    });

    it('should populate venue and contract fallbacks', () => {
      response.data.slice(0, 20).forEach((market) => {
        expect(typeof market.venue).toBe('string');
        expect(market.venue.length).toBeGreaterThan(0);
        expect(typeof market.contract).toBe('string');
        expect(market.contract.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('RWA Perps API - Market by ID', () => {
  let currentResponse: ApiResponse<RwaPerpsCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaPerpsCurrentResponse>(endpoints.RWA_PERPS.CURRENT);
  });

  it('should return a single market for a valid ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);

    const response = await apiClient.get<RwaPerpsMarket>(endpoints.RWA_PERPS.MARKET_BY_ID(id));
    expectSuccessfulResponse(response);

    const result = validate(response.data, rwaPerpsMarketSchema, 'RWA Perps Market');
    expect(result.success).toBe(true);
    expect(String(response.data.id).toLowerCase()).toBe(id.toLowerCase());
  });

  it('should return 404 for a non-existent market ID', async () => {
    const response = await apiClient.get(
      endpoints.RWA_PERPS.MARKET_BY_ID('non-existent-market-id-99999')
    );
    expect(response.status).toBe(404);
  });
});
