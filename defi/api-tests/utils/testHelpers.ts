import { ApiResponse } from './config/apiClient';

export function expectSuccessfulResponse<T>(response: ApiResponse<T>): void {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  expect(response.data).toBeDefined();
}

export function expectStatusCode<T>(response: ApiResponse<T>, statusCode: number): void {
  expect(response.status).toBe(statusCode);
}

export function expectArrayResponse<T>(response: ApiResponse<T[]>): void {
  expectSuccessfulResponse(response);
  expect(Array.isArray(response.data)).toBe(true);
}

export function expectObjectResponse<T>(response: ApiResponse<T>): void {
  expectSuccessfulResponse(response);
  expect(typeof response.data).toBe('object');
  expect(response.data).not.toBeNull();
}

export function expectNonEmptyArray<T>(data: T[]): void {
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);
}

export function expectObjectHasKeys(obj: Record<string, any>, keys: string[]): void {
  keys.forEach((key) => {
    expect(obj).toHaveProperty(key);
  });
}

export function expectArrayItemsHaveKeys<T extends Record<string, any>>(
  data: T[],
  keys: string[]
): void {
  expectNonEmptyArray(data);
  data.forEach((item) => {
    keys.forEach((key) => {
      expect(item).toHaveProperty(key);
    });
  });
}

export function expectValidNumber(value: any): void {
  expect(typeof value).toBe('number');
  expect(Number.isFinite(value)).toBe(true);
}

export function expectPositiveNumber(value: any): void {
  expectValidNumber(value);
  expect(value).toBeGreaterThan(0);
}

export function expectNonNegativeNumber(value: any): void {
  expectValidNumber(value);
  expect(value).toBeGreaterThanOrEqual(0);
}

export function expectValidTimestamp(timestamp: any): void {
  expectValidNumber(timestamp);
  const minTimestamp = 1262304000;
  const maxTimestamp = 4102444800;
  const timestampInSeconds = timestamp > maxTimestamp ? timestamp / 1000 : timestamp;
  expect(timestampInSeconds).toBeGreaterThan(minTimestamp);
  expect(timestampInSeconds).toBeLessThan(maxTimestamp);
}

export function expectNonEmptyString(value: any): void {
  expect(typeof value).toBe('string');
  expect(value.length).toBeGreaterThanOrEqual(0);
}

export function expectValidPercentageChange(value: any): void {
  if (value === null || value === undefined) return;
  expectValidNumber(value);
  expect(value).toBeGreaterThan(-100);
  expect(value).toBeLessThan(1000000);
}

/**
 * Checks if data is fresh by verifying the most recent timestamp is within 1 day
 * @param timestamps - Array of timestamps (can be numbers or strings)
 * @param maxAgeInSeconds - Maximum age in seconds (default: 86400 = 1 day)
 */
export function expectFreshData(
  timestamps: (number | string)[],
  maxAgeInSeconds: number = 86400
): void {
  expect(timestamps.length).toBeGreaterThan(0);

  // Convert all timestamps to numbers
  const numericTimestamps = timestamps.map((ts) => {
    return typeof ts === 'string' ? Number(ts) : ts;
  });

  // Find the most recent timestamp
  const mostRecentTimestamp = Math.max(...numericTimestamps);
  
  // Current time in seconds
  const nowInSeconds = Math.floor(Date.now() / 1000);
  
  // Check if most recent data is within the specified age
  const ageInSeconds = nowInSeconds - mostRecentTimestamp;
  
  expect(ageInSeconds).toBeLessThanOrEqual(maxAgeInSeconds);
  expect(mostRecentTimestamp).toBeGreaterThan(0);
}

