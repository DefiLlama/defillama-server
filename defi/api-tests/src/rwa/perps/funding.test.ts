import { createApiClient, ApiResponse } from '../../../utils/config/apiClient';
import { endpoints } from '../../../utils/config/endpoints';
import { RwaPerpsCurrentResponse, RwaPerpsFundingResponse } from './types';
import { rwaPerpsFundingResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidTimestamp,
} from '../../../utils/testHelpers';
import { validate } from '../../../utils/validation';

const apiClient = createApiClient(endpoints.RWA_PERPS.BASE_URL);

const ONE_DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * ONE_DAY;

describe('RWA Perps API - Funding History', () => {
  let currentResponse: ApiResponse<RwaPerpsCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaPerpsCurrentResponse>(endpoints.RWA_PERPS.CURRENT);
  });

  it('should return funding history for a valid market ID', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);

    const response = await apiClient.get<RwaPerpsFundingResponse>(
      endpoints.RWA_PERPS.FUNDING(id)
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);

    const result = validate(response.data, rwaPerpsFundingResponseSchema, 'RWA Perps Funding');
    expect(result.success).toBe(true);

    if (response.data.length > 0) {
      response.data.slice(0, 5).forEach((row) => {
        expectValidTimestamp(row.timestamp);
      });
    }
  });

  it('should respect startTime/endTime query params', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - THIRTY_DAYS;

    const response = await apiClient.get<RwaPerpsFundingResponse>(
      `${endpoints.RWA_PERPS.FUNDING(id)}?startTime=${startTime}&endTime=${endTime}`
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);

    response.data.forEach((row) => {
      expect(row.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(row.timestamp).toBeLessThanOrEqual(endTime);
    });
  });

  it('should return an empty array for a non-existent market ID', async () => {
    const response = await apiClient.get<RwaPerpsFundingResponse>(
      endpoints.RWA_PERPS.FUNDING('non-existent-funding-id-99999')
    );
    expectSuccessfulResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toHaveLength(0);
  });
});
