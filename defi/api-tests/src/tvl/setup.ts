import { createApiClient, ApiClient } from '../../utils/config/apiClient';
import { TVL_ENDPOINTS } from '../../utils/config/endpoints';

let apiClient: ApiClient | null = null;

export function initializeTvlTests(): ApiClient {
  if (!apiClient) {
    apiClient = createApiClient(TVL_ENDPOINTS.BASE_URL);
  }
  return apiClient;
}

export function getTvlClient(): ApiClient {
  if (!apiClient) {
    return initializeTvlTests();
  }
  return apiClient;
}

export { TVL_ENDPOINTS };

