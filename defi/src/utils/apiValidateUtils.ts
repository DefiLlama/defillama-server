import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import Ajv from 'ajv';

export interface SchemaInfo {
  schema: any;
  serverUrl: string;
}

export interface EndpointInfo {
  path: string;
  serverUrl: string;
  schema: any;
  method: string;
  queryParams?: Record<string, string>;
  override?: EndpointOverride;
}

export interface ValidationResult {
  endpoint: string;
  serverUrl: string;
  status: 'pass' | 'fail' | 'expected_failure';
  errors: string[];
  responseTime?: number;
  override?: EndpointOverride;
  queryParams?: Record<string, string>;
}

const schemasCache = new Map<string, any>();
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  strict: false,
  removeAdditional: false,
  coerceTypes: true
});

//handle uint
ajv.addFormat('uint', {
  type: 'number',
  validate: (value: number) => {
    return Number.isInteger(value) && value >= 0;
  }
});


export interface EndpointOverride {
  parameterOverrides?: Record<string, string[]>;
  skip?: boolean;
  expectedFailure?: boolean;
  reason?: string;
}

export const ENDPOINT_OVERRIDES: Record<string, EndpointOverride> = {

};

export async function fetchWithRetry(
  url: string, 
  retries: number = 3,
  delay: number = 1000,
  timeout: number = 45000
): Promise<AxiosResponse> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': 'DefiLlama-API-Validator/1.0'
        }
      });
      return response;
    } catch (error: any) {
      const isLastAttempt = i === retries;
      const shouldRetry = shouldRetryError(error);
      
      if (isLastAttempt || !shouldRetry) {
        throw error;
      }
      
      const backoffDelay = calculateBackoffDelay(delay, i, error);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  throw new Error('Unexpected error in fetchWithRetry');
}

function shouldRetryError(error: any): boolean {
  if (error.code) {
    const retryableCodes = [
      'ECONNRESET',     
      'ETIMEDOUT',      
      'ENOTFOUND',      
      'ECONNREFUSED',   
      'EHOSTUNREACH',   
      'EPIPE',          
      'EAI_AGAIN'       
    ];
    
    if (retryableCodes.includes(error.code)) {
      return true;
    }
  }
  
  if (error.response?.status) {
    const retryableStatuses = [
      429,
      502,
      503,
      504,
      520,
      521,
      522,
      523,
      524 
    ];
    
    return retryableStatuses.includes(error.response.status);
  }
  
  if (error.message?.toLowerCase().includes('timeout')) {
    return true;
  }
  
  return false;
}

function calculateBackoffDelay(baseDelay: number, attempt: number, error: any): number {
  let backoffDelay = baseDelay * Math.pow(2, attempt);
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    if (retryAfter) {
      const retryAfterMs = parseInt(retryAfter) * 1000;
      backoffDelay = Math.max(backoffDelay, retryAfterMs);
    } else {
      backoffDelay = baseDelay * Math.pow(3, attempt);
    }
  }
  
  const jitter = backoffDelay * 0.25 * (Math.random() - 0.5);
  backoffDelay += jitter;
  
  return Math.min(backoffDelay, 30000);
}

export async function loadOpenApiSpec(apiType: 'free' | 'pro' = 'free'): Promise<any> {
  const cacheKey = `openapi-${apiType}`;
  
  if (schemasCache.has(cacheKey)) {
    return schemasCache.get(cacheKey);
  }

  const githubUrl = apiType === 'pro' 
    ? 'https://raw.githubusercontent.com/DefiLlama/api-docs/refs/heads/main/defillama-openapi-pro.json'
    : 'https://raw.githubusercontent.com/DefiLlama/api-docs/refs/heads/main/defillama-openapi-free.json';

  try {
    console.log(`getting spec from api-docs for ${apiType}`);
    const response = await axios.get(githubUrl, {
      timeout: 30000,
    });
    
    const spec = response.data;
    schemasCache.set(cacheKey, spec);
    return spec;
    
  } catch (error: any) {    
    throw new Error(`spec fetch failed: ${error.message}`);
  }
}

export function getServerUrl(endpoint: string, spec: any, apiType: 'free' | 'pro' = 'free'): string {
  try {
    const endpointDef = spec.paths[endpoint];
    let serverUrl: string;
    
    if (!endpointDef) {
      serverUrl = spec.servers?.[0]?.url || process.env.BASE_API_URL || 'https://api.llama.fi';
    } else {
      const getMethod = endpointDef.get;
      if (getMethod?.servers?.length > 0) {
        serverUrl = getMethod.servers[0].url;
      } else {
        serverUrl = spec.servers?.[0]?.url || process.env.BASE_API_URL || 'https://api.llama.fi';
      }
    }
    
    if (apiType === 'pro' && process.env.PRO_API_KEY && serverUrl.includes('pro-api.llama.fi')) {
      serverUrl = `${serverUrl}/${process.env.PRO_API_KEY}`;
    }
    
    return serverUrl;
  } catch (error) {
    const baseUrl = process.env.BASE_API_URL || 'https://api.llama.fi';
    
    if (apiType === 'pro' && process.env.PRO_API_KEY && baseUrl.includes('pro-api.llama.fi')) {
      return `${baseUrl}/${process.env.PRO_API_KEY}`;
    }
    
    return baseUrl;
  }
}

export function getBetaServerUrl(prodServerUrl: string): string {
  if (prodServerUrl.includes('api.llama.fi')) {
    return prodServerUrl.replace('api.llama.fi', process.env.BETA_API_URL?.replace('https://', '') || '');
  }
  
  return process.env.BETA_API_URL || '';
}

function makeFieldsNullable(schema: any, isRoot: boolean = false): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  
  if (isRoot) {
    if (schema.type === 'array') {
      return {
        ...schema,
        items: schema.items ? makeFieldsNullable(schema.items) : schema.items
      };
    }
    if (schema.type === 'object') {
      const newProperties: any = {};
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          newProperties[key] = makeFieldsNullable(value);
        }
      }
      return {
        ...schema,
        properties: newProperties,
        additionalProperties: schema.additionalProperties ? makeFieldsNullable(schema.additionalProperties) : schema.additionalProperties
      };
    }
  }
  
  if (schema.type === 'number') {
    return {
      ...schema,
      type: ['number', 'string', 'null']  //sometime we return numbers as strings
    };
  }
  
  if (Array.isArray(schema.type) && schema.type.includes('number') && schema.type.includes('null')) {
    return {
      ...schema,
      type: ['number', 'string', 'null']
    };
  }
  
  //make strings flexible to accept arrays and numbers (for fields like governanceID, valuation)
  if (schema.type === 'string') {
    return {
      ...schema,
      type: ['string', 'array', 'number', 'null']
    };
  }
  
  //make arrays nullable and process their items
  if (schema.type === 'array') {
    return {
      ...schema,
      type: ['array', 'null'],
      items: schema.items ? makeFieldsNullable(schema.items) : schema.items
    };
  }
  
  //handle objects with properties - make them nullable
  if (schema.type === 'object' && schema.properties) {
    const newProperties: any = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      newProperties[key] = makeFieldsNullable(value);
    }
    return {
      ...schema,
      type: ['object', 'null'],
      properties: newProperties,
      additionalProperties: true
    };
  }
  
  //handle objects with additionalProperties (like chainTvls) - make them nullable too
  if (schema.type === 'object' && schema.additionalProperties) {
    return {
      ...schema,
      type: ['object', 'null'],
      additionalProperties: makeFieldsNullable(schema.additionalProperties)
    };
  }

  //handle plain objects without properties or additionalProperties - make them very flexible
  if (schema.type === 'object' && !schema.properties && !schema.additionalProperties) {
    return {
      ...schema,
      type: ['object', 'null', 'string']
    };
  }
  
  //handle anyOf, oneOf, allOf - make them more permissive
  if (schema.anyOf) {
    return {
      ...schema,
      anyOf: schema.anyOf.map((s: any) => makeFieldsNullable(s))
    };
  }
  
  if (schema.oneOf) {
    const oneOfTypes = schema.oneOf.map((s: any) => makeFieldsNullable(s));
    oneOfTypes.push({ type: ['string', 'number', 'object', 'array', 'boolean', 'null'] });
    return {
      ...schema,
      anyOf: oneOfTypes  //use anyOf instead of oneOf for more permissive validation
    };
  }
  
  if (schema.allOf) {
    return {
      ...schema,
      allOf: schema.allOf.map((s: any) => makeFieldsNullable(s))
    };
  }
  
  return schema;
}

export function extractSchemaFromOpenApi(endpoint: string, spec: any): any | null {
  try {
    const endpointDef = spec.paths[endpoint];
    if (!endpointDef?.get?.responses?.['200']?.content?.['application/json']?.schema) {
      return null;
    }
    
    const rawSchema = endpointDef.get.responses['200'].content['application/json'].schema;
    return makeFieldsNullable(rawSchema, true);
  } catch (error) {
    console.error(`Error extracting schema for endpoint ${endpoint}:`, error);
    return null;
  }
}

export interface QueryParameterInfo {
  queryParams: Record<string, string[]>;
  hasRequiredParams: boolean;
}

export function extractQueryParameters(endpointDef: any): QueryParameterInfo {
  const queryParams: Record<string, string[]> = {};
  let hasRequiredParams = false;
  
  if (!endpointDef.parameters) {
    return { queryParams, hasRequiredParams };
  }
  
  endpointDef.parameters.forEach((param: any) => {
    if (param.in === 'query') {
      const paramName = param.name;
      const schema = param.schema;
      
      if (param.required) {
        hasRequiredParams = true;
      }
      
      //use schema example if available
      if (schema?.example !== undefined && schema?.example !== null) {
        queryParams[paramName] = [String(schema.example)];
      }
      //use schema default if available
      else if (schema?.default !== undefined && schema?.default !== null) {
        queryParams[paramName] = [String(schema.default)];
      }
      //use schema enum if available
      else if (schema?.enum && Array.isArray(schema.enum)) {
        queryParams[paramName] = schema.enum.map(String);
      }
    }
  });
  
  return { queryParams, hasRequiredParams };
}

export function buildUrlWithQueryParams(baseUrl: string, queryParams: Record<string, string>): string {
  if (Object.keys(queryParams).length === 0) {
    return baseUrl;
  }
  
  const url = new URL(baseUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
}

export function generateQueryParameterVariations(queryParams: Record<string, string[]>, hasRequiredParams: boolean = false): Record<string, string>[] {
  if (Object.keys(queryParams).length === 0) {
    return [{}];
  }
  
  const paramNames = Object.keys(queryParams);
  const variations: Record<string, string>[] = [];
  const maxVariationsPerEndpoint = 10; 

  function generateCombinations(currentParams: Record<string, string>, remainingParamNames: string[]): void {
    if (variations.length >= maxVariationsPerEndpoint) {
      return;
    }
    
    if (remainingParamNames.length === 0) {
      variations.push({ ...currentParams });
      return;
    }
    
    const paramName = remainingParamNames[0];
    const samples = queryParams[paramName];
    
    samples.forEach(sample => {
      if (variations.length < maxVariationsPerEndpoint) {
        const newParams = { ...currentParams, [paramName]: sample };
        generateCombinations(newParams, remainingParamNames.slice(1));
      }
    });
  }
  
  if (!hasRequiredParams) {
    variations.push({});
  }
  
  generateCombinations({}, paramNames);
  
  return variations.slice(0, maxVariationsPerEndpoint);
}

export function getEndpointOverride(endpoint: string): EndpointOverride | undefined {
  if (ENDPOINT_OVERRIDES[endpoint]) {
    return ENDPOINT_OVERRIDES[endpoint];
  }
  
  for (const [pattern, override] of Object.entries(ENDPOINT_OVERRIDES)) {
    if (pattern.includes('{') && endpointMatchesPattern(endpoint, pattern)) {
      return override;
    }
  }
  
  return undefined;
}

function endpointMatchesPattern(endpoint: string, pattern: string): boolean {
  const regexPattern = pattern.replace(/\{[^}]+\}/g, '[^/]+');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(endpoint);
}

export function substituteParameters(endpoint: string, spec: any, parameterValues?: Record<string, string>): string[] {
  const paramMatches = endpoint.match(/\{([^}]+)\}/g);
  
  if (!paramMatches) {
    return [endpoint];
  }

  const override = getEndpointOverride(endpoint);
  
  const variations: string[] = [];
  const paramNames = paramMatches.map(match => match.slice(1, -1));
  
  const endpointDef = spec.paths[endpoint];
  const pathParameters = endpointDef?.get?.parameters?.filter((p: any) => p.in === 'path') || [];
  
  function generateCombinations(currentEndpoint: string, remainingParams: string[]): void {
    if (remainingParams.length === 0) {
      variations.push(currentEndpoint);
      return;
    }
    
    const paramName = remainingParams[0];
    
    let samples: string[];
    
    if (parameterValues?.[paramName]) {
      samples = [parameterValues[paramName]];
    } else if (override?.parameterOverrides?.[paramName]) {
      samples = override.parameterOverrides[paramName];
    } else {
      const paramDef = pathParameters.find((p: any) => p.name === paramName);
      
      if (paramDef?.schema?.example !== undefined && paramDef?.schema?.example !== null) {
        samples = [String(paramDef.schema.example)];
      } else if (paramDef?.schema?.default !== undefined && paramDef?.schema?.default !== null) {
        samples = [String(paramDef.schema.default)];
      } else {
        samples = ['sample'];
      }
    }
    
    samples.forEach(sample => {
      const newEndpoint = currentEndpoint.replace(`{${paramName}}`, sample);
      generateCombinations(newEndpoint, remainingParams.slice(1));
    });
  }
  
  generateCombinations(endpoint, paramNames);
  return variations;
}

export function getAllEndpoints(spec: any, includeParameterized: boolean = true, apiType: 'free' | 'pro' = 'free'): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];
  
  Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
    if (methods.get) {
      const serverUrl = getServerUrl(path, spec, apiType);
      const schema = extractSchemaFromOpenApi(path, spec);
      const { queryParams, hasRequiredParams } = extractQueryParameters(methods.get);
      
      if (schema) {
        if (path.includes('{') && includeParameterized) {
          const pathVariations = substituteParameters(path, spec);
          pathVariations.forEach(variation => {
            const override = getEndpointOverride(variation);
            
            if (override?.skip) {
              return;
            }
            
            const queryVariations = generateQueryParameterVariations(queryParams, hasRequiredParams);
            
            queryVariations.forEach(queryParamSet => {
              endpoints.push({
                path: variation,
                serverUrl,
                schema,
                method: 'GET',
                queryParams: queryParamSet,
                override
              });
            });
          });
        } else if (!path.includes('{')) {
          const override = getEndpointOverride(path);
          
          if (override?.skip) {
            return;
          }
          
          const queryVariations = generateQueryParameterVariations(queryParams, hasRequiredParams);
          
          queryVariations.forEach(queryParamSet => {
            endpoints.push({
              path,
              serverUrl,
              schema,
              method: 'GET',
              queryParams: queryParamSet,
              override
            });
          });
        }
      }
    }
  });
  
  return endpoints;
}

export async function validateResponseAgainstSchema(
  response: any, 
  schema: any,
  isDebug: boolean = false
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    if (isDebug) {
      console.log('\n=== VALIDATION DEBUG ===');
      console.log('Response type:', typeof response);
      console.log('Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
      console.log('Response preview:', JSON.stringify(response, null, 2).slice(0, 500) + '...');
    }
    
    let actualData = response;
    if (response && typeof response === 'object' && response.body && typeof response.body === 'string') {
      if (isDebug) {
        console.log('Detected escaped JSON in "body" field!');
      }
      try {
        const parsedBody = JSON.parse(response.body);
        if (isDebug) {
          console.log('Successfully parsed body:', JSON.stringify(parsedBody, null, 2).slice(0, 300) + '...');
        }
        actualData = parsedBody;
      } catch (parseError) {
        if (isDebug) {
          console.log('Failed to parse body as JSON:', parseError);
        }
      }
    }
    
    if (isDebug) {
      console.log('Schema expects type:', schema.type || 'Any');
      console.log('Schema properties:', schema.properties ? Object.keys(schema.properties) : 'N/A');
      console.log('========================\n');
    }
    
    const validate = ajv.compile(schema);
    const valid = validate(actualData);
    
    if (valid) {
      return { valid: true, errors: [] };
    } else {
      const errors = validate.errors?.map(error => {
        const errorMsg = `${error.instancePath || '/body'}: ${error.message}`;
        if (isDebug) {
          console.log('Validation error details:', {
            path: error.instancePath || '/body',
            message: error.message,
            data: error.data
          });
        }
        return errorMsg;
      }) || ['Unknown validation error'];
      return { valid: false, errors };
    }
  } catch (error: any) {
    if (isDebug) {
      console.log('Schema validation exception:', error.message);
    }
    return { 
      valid: false, 
      errors: [`Schema validation error: ${error.message}`] 
    };
  }
}

export async function testEndpoint(
  endpointInfo: EndpointInfo, 
  isDebug: boolean = false,
  retryCount: number = 3,
  retryDelay: number = 1000,
  requestTimeout: number = 45000
): Promise<ValidationResult> {
  const baseUrl = `${endpointInfo.serverUrl}${endpointInfo.path}`;
  const fullUrl = buildUrlWithQueryParams(baseUrl, endpointInfo.queryParams || {});
  const startTime = Date.now();
  
  try {
    const response = await fetchWithRetry(fullUrl, retryCount, retryDelay, requestTimeout);
    const responseTime = Date.now() - startTime;
    
    if (response.status !== 200) {
      if (endpointInfo.override?.expectedFailure) {
        return {
          endpoint: endpointInfo.path,
          serverUrl: endpointInfo.serverUrl,
          status: 'expected_failure',
          errors: [`Expected failure: ${endpointInfo.override.reason || 'No reason provided'}`],
          responseTime,
          override: endpointInfo.override,
          queryParams: endpointInfo.queryParams
        };
      }
      
      return {
        endpoint: endpointInfo.path,
        serverUrl: endpointInfo.serverUrl,
        status: 'fail',
        errors: [`HTTP ${response.status}: ${response.statusText}`],
        responseTime,
        override: endpointInfo.override,
        queryParams: endpointInfo.queryParams
      };
    }
    
    if (isDebug) {
      console.log(`\n--- ENDPOINT DEBUG: ${endpointInfo.path} ---`);
      console.log('Raw response status:', response.status);
      console.log('Raw response headers content-type:', response.headers['content-type']);
      console.log('Raw response data type:', typeof response.data);
      console.log('Raw response data preview:', JSON.stringify(response.data, null, 2).slice(0, 400) + '...');
      console.log('Expected schema type:', endpointInfo.schema?.type);
      console.log('--- END ENDPOINT DEBUG ---\n');
    }
    
    const validation = await validateResponseAgainstSchema(response.data, endpointInfo.schema, isDebug);
    
    return {
      endpoint: endpointInfo.path,
      serverUrl: endpointInfo.serverUrl,
      status: validation.valid ? 'pass' : 'fail',
      errors: validation.errors,
      responseTime,
      override: endpointInfo.override,
      queryParams: endpointInfo.queryParams
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (endpointInfo.override?.expectedFailure) {
      return {
        endpoint: endpointInfo.path,
        serverUrl: endpointInfo.serverUrl,
        status: 'expected_failure',
        errors: [`Expected failure: ${endpointInfo.override.reason || 'No reason provided'}`],
        responseTime,
        override: endpointInfo.override,
        queryParams: endpointInfo.queryParams
      };
    }
    
    return {
      endpoint: endpointInfo.path,
      serverUrl: endpointInfo.serverUrl,
      status: 'fail',
      errors: [error.message || 'Unknown error'],
      responseTime,
      override: endpointInfo.override,
      queryParams: endpointInfo.queryParams
    };
  }
}

export function compareResponses(
  baseResponse: any,
  betaResponse: any,
  tolerance: number = 0.1
): { isMatch: boolean; differences: string[] } {
  const differences: string[] = [];
  
  function deepCompare(obj1: any, obj2: any, path: string = 'root'): void {
    if (typeof obj1 !== typeof obj2) {
      differences.push(`${path}: Type mismatch - base: ${typeof obj1}, beta: ${typeof obj2}`);
      return;
    }
    
    if (obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        differences.push(`${path}: Null mismatch - base: ${obj1}, beta: ${obj2}`);
      }
      return;
    }
    
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      if (obj1 === 0 && obj2 === 0) return;
      
      const deviation = Math.abs((obj1 - obj2) / (obj1 || 1));
      if (deviation > tolerance) {
        differences.push(`${path}: Value deviation ${(deviation * 100).toFixed(2)}% - base: ${obj1}, beta: ${obj2}`);
      }
      return;
    }
    
    if (typeof obj1 === 'string' || typeof obj1 === 'boolean') {
      if (obj1 !== obj2) {
        differences.push(`${path}: Value mismatch - base: ${obj1}, beta: ${obj2}`);
      }
      return;
    }
    
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        differences.push(`${path}: Array length mismatch - base: ${obj1.length}, beta: ${obj2.length}`);
      }
      
      const minLength = Math.min(obj1.length, obj2.length);
      
      if (minLength <= 10) {
        for (let i = 0; i < minLength; i++) {
          deepCompare(obj1[i], obj2[i], `${path}[${i}]`);
        }
      } else {
        const indicesToCompare = new Set<number>();
        
        for (let i = 0; i < 10; i++) {
          indicesToCompare.add(i);
        }
        
        for (let i = Math.max(10, minLength - 10); i < minLength; i++) {
          indicesToCompare.add(i);
        }
        
        //highest 10 items (sort by numerical value if applicable, or by 'date' property for objects)
        try {
          const sortedIndices1 = [...Array(obj1.length).keys()].sort((a, b) => {
            const val1 = obj1[a];
            const val2 = obj1[b];
            
            if (val1 && typeof val1 === 'object' && 'date' in val1 && val2 && typeof val2 === 'object' && 'tvl' in val2) {
              return (Number(val2.tvl) || 0) - (Number(val1.tvl) || 0);
            }
            if (typeof val1 === 'number' && typeof val2 === 'number') {
              return val2 - val1;
            }
            if (val1 && typeof val1 === 'object' && val2 && typeof val2 === 'object') {
              const numericKeys = Object.keys(val1).filter(key => typeof val1[key] === 'number');
              if (numericKeys.length > 0) {
                const key = numericKeys[0];
                return (Number(val2[key]) || 0) - (Number(val1[key]) || 0);
              }
            }
            return 0;
          });
          
          for (let i = 0; i < Math.min(10, sortedIndices1.length); i++) {
            indicesToCompare.add(sortedIndices1[i]);
          }
        } catch (error) {
        }
        
        const availableIndices = [];
        for (let i = 0; i < minLength; i++) {
          if (!indicesToCompare.has(i)) {
            availableIndices.push(i);
          }
        }
        
        for (let i = availableIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
        }
        
        for (let i = 0; i < Math.min(10, availableIndices.length); i++) {
          indicesToCompare.add(availableIndices[i]);
        }
        
        for (const index of Array.from(indicesToCompare).sort((a, b) => a - b)) {
          if (index < minLength) {
            deepCompare(obj1[index], obj2[index], `${path}[${index}]`);
          }
        }
      }
      return;
    }
    
    if (typeof obj1 === 'object' && typeof obj2 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      
      const allKeys = [...new Set([...keys1, ...keys2])];
      for (const key of allKeys) {
        if (!(key in obj1)) {
          differences.push(`${path}.${key}: Missing in base response`);
        } else if (!(key in obj2)) {
          differences.push(`${path}.${key}: Missing in beta response`);
        } else {
          deepCompare(obj1[key], obj2[key], `${path}.${key}`);
        }
      }
    }
  }
  
  deepCompare(baseResponse, betaResponse);
  
  return {
    isMatch: differences.length === 0,
    differences
  };
}

export function sanitizeUrlForDisplay(url: string): string {
  if (url.includes('pro-api.llama.fi')) {
    const parts = url.split('/');
    if (parts.length >= 4 && parts[2] === 'pro-api.llama.fi') {
      return parts.slice(0, 3).join('/') + '/' + parts.slice(4).join('/');
    }
  }
  return url;
}

export function buildEndpointDisplayPath(endpoint: string, queryParams?: Record<string, string>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return endpoint;
  }
  
  const params = new URLSearchParams(queryParams);
  return `${endpoint}?${params.toString()}`;
}

export { sendMessage } from '../../src/utils/discord';