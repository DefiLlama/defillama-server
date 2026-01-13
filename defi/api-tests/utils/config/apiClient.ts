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
      // Disable keep-alive to prevent hanging connections
      httpAgent: new (require('http').Agent)({ 
        keepAlive: false,
        timeout: API_CONFIG.timeout,
      }),
      httpsAgent: new (require('https').Agent)({ 
        keepAlive: false,
        timeout: API_CONFIG.timeout,
        rejectUnauthorized: true,
      }),
      // Additional robustness settings
      maxRedirects: 5,
      validateStatus: (status) => status < 600, // Don't reject on any status code
      maxContentLength: 100 * 1024 * 1024, // 100MB max response size
      maxBodyLength: 100 * 1024 * 1024, // 100MB max request size
      ...config,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Don't reject on error responses - we want to handle them gracefully
    this.client.interceptors.response.use(
      (response) => {
        // If content-type is text/plain but data looks like JSON, parse it
        if (response.data && typeof response.data === 'string') {
          try {
            // Try to parse as JSON if it looks like JSON
            if (response.data.trim().startsWith('{') || response.data.trim().startsWith('[')) {
              response.data = JSON.parse(response.data);
            }
          } catch (e) {
            // If parsing fails, leave as string (might be intentional like error messages)
          }
        }
        return response;
      },
      (error) => {
        // For HTTP error responses (4xx, 5xx), return a response-like object
        if (error.response) {
          return Promise.resolve(error.response);
        }
        // For network errors, reject
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError): ApiErrorResponse {
    if (error.response) {
      // HTTP error response (4xx, 5xx)
      return {
        message: error.message,
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        details: error.response.data,
      };
    } else if (error.request) {
      // Network error (no response received)
      let message = 'No response received from server';
      let statusText = 'Network Error';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Request timeout - server took too long to respond';
        statusText = 'Timeout Error';
      } else if (error.code === 'ENOTFOUND') {
        message = 'DNS lookup failed - unable to resolve server address';
        statusText = 'DNS Error';
      } else if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused - server is not accepting connections';
        statusText = 'Connection Refused';
      } else if (error.code === 'ETIMEDOUT') {
        message = 'Connection timeout - unable to establish connection';
        statusText = 'Connection Timeout';
      }
      
      return {
        message,
        status: 0,
        statusText,
        url: error.config?.url,
        details: { code: error.code, message: error.message },
      };
    } else {
      // Request setup error
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
    retries: number = this.retryCount,
    attempt: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Retry on network errors AND timeout errors
      const isNetworkError = !axiosError.response;
      const isTimeoutError = axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT';
      const shouldRetry = retries > 0 && (isNetworkError || isTimeoutError);
      
      if (shouldRetry) {
        // Exponential backoff: base delay * (2 ^ attempt)
        // attempt 0: 1000ms, attempt 1: 2000ms, attempt 2: 4000ms
        const backoffDelay = this.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add random jitter (0-1000ms)
        const totalDelay = backoffDelay + jitter;
        
        const errorType = isTimeoutError ? 'Timeout' : 'Network error';
        console.log(`${errorType}, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${this.retryCount})...`);
        
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        return this.retryRequest(requestFn, retries - 1, attempt + 1);
      }
      
      throw error;
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>(() => this.client.get<T>(url, config));
      return this.formatResponse(response);
    } catch (error) {
      // Network or request setup errors - throw them
      throw this.handleError(error as AxiosError);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.retryRequest<T>(() => this.client.post<T>(url, data, config));
      return this.formatResponse(response);
    } catch (error) {
      // Network or request setup errors - throw them
      throw this.handleError(error as AxiosError);
    }
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

