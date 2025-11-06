import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from './endpoints';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  statusText: string;
  url?: string;
  details?: any;
}

export class ApiClient {
  private client: AxiosInstance;
  private retryCount: number;
  private retryDelay: number;

  constructor(baseURL: string = '', config: Partial<AxiosRequestConfig> = {}) {
    this.retryCount = API_CONFIG.retryCount;
    this.retryDelay = API_CONFIG.retryDelay;

    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(API_CONFIG.apiKey && { 'X-API-Key': API_CONFIG.apiKey }),
      },
      httpAgent: new (require('http').Agent)({ keepAlive: false }),
      httpsAgent: new (require('https').Agent)({ keepAlive: false }),
      ...config,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(this.handleError(error))
    );
  }

  private handleError(error: AxiosError): ApiErrorResponse {
    if (error.response) {
      return {
        message: error.message,
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        details: error.response.data,
      };
    } else if (error.request) {
      return {
        message: 'No response received from server',
        status: 0,
        statusText: 'Network Error',
        url: error.config?.url,
        details: error.message,
      };
    } else {
      return {
        message: error.message,
        status: 0,
        statusText: 'Request Setup Error',
        details: error.message,
      };
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = this.retryCount
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest<T>(() => this.client.get<T>(url, config));
    return this.formatResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.retryRequest<T>(() => this.client.post<T>(url, data, config));
    return this.formatResponse(response);
  }

  private formatResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }
}

export function createApiClient(baseURL: string = '', config?: Partial<AxiosRequestConfig>): ApiClient {
  return new ApiClient(baseURL, config);
}

