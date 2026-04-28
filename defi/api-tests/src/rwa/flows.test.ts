import { createApiClient, ApiResponse } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RwaCurrentResponse, RwaFlowsResponse } from './types';
import { rwaFlowsResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.RWA.BASE_URL);

const ONE_DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * ONE_DAY;

describe('RWA API - Flows', () => {
  let currentResponse: ApiResponse<RwaCurrentResponse>;

  beforeAll(async () => {
    currentResponse = await apiClient.get<RwaCurrentResponse>(endpoints.RWA.CURRENT);
  });

  it('should return flow series for a valid RWA ID with start param', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const start = Math.floor(Date.now() / 1000) - THIRTY_DAYS;

    const response = await apiClient.get<RwaFlowsResponse>(
      `${endpoints.RWA.FLOWS(id)}?start=${start}`
    );
    expectSuccessfulResponse(response);
    expectObjectResponse(response);

    const result = validate(response.data, rwaFlowsResponseSchema, 'RWA Flows');
    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Validation errors (first 5):', result.errors.slice(0, 5));
    }

    expect(String(response.data.id)).toBe(id);
    expect(response.data.start).toBe(start);
    expect(response.data.end).toBeGreaterThanOrEqual(start);
    expect(Array.isArray(response.data.data)).toBe(true);

    if (response.data.data.length > 0) {
      response.data.data.slice(0, 5).forEach((point) => {
        expectValidTimestamp(point.timestamp);
      });
    }
  });

  it('should accept an explicit end query param', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const end = Math.floor(Date.now() / 1000);
    const start = end - THIRTY_DAYS;

    const response = await apiClient.get<RwaFlowsResponse>(
      `${endpoints.RWA.FLOWS(id)}?start=${start}&end=${end}`
    );
    expectSuccessfulResponse(response);
    expect(response.data.start).toBe(start);
    expect(response.data.end).toBe(end);
  });

  it('should reject when start query param is missing', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);

    const response = await apiClient.get(endpoints.RWA.FLOWS(id));
    expect(response.status).toBe(400);
  });

  it('should reject when start is non-numeric', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);

    const response = await apiClient.get(`${endpoints.RWA.FLOWS(id)}?start=notanumber`);
    expect(response.status).toBe(400);
  });

  it('should reject when end is before start', async () => {
    const firstItem = currentResponse.data[0];
    const id = String(firstItem.id);
    const start = Math.floor(Date.now() / 1000);
    const end = start - ONE_DAY;

    const response = await apiClient.get(
      `${endpoints.RWA.FLOWS(id)}?start=${start}&end=${end}`
    );
    expect(response.status).toBe(400);
  });
});
