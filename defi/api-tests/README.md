# DefiLlama API Testing Framework

Type-safe API testing framework for DefiLlama endpoints using Jest and TypeScript.

## Architecture

```
api-tests/
├── src/
│   ├── tvl/              # TVL category
│   │   ├── setup.ts      # Shared client initialization
│   │   ├── types.ts      # Category-specific types
│   │   ├── protocols.test.ts
│   │   └── charts.test.ts
│   ├── stablecoins/      # Add tests here
│   └── ...
└── utils/
    ├── config/           # API client & endpoints config
    ├── testHelpers.ts    # Common assertions
    └── validators.ts     # Response validators
```

Uses parent `defi` folder configurations (jest.config.js, tsconfig.json, .gitignore, .env).

## Category Pattern

Each category follows this structure:

**setup.ts** - Initialize and cache API client
```typescript
import { createApiClient, ApiClient } from '../../utils/config/apiClient';
import { TVL_ENDPOINTS } from '../../utils/config/endpoints';

let apiClient: ApiClient | null = null;

export function initializeTvlTests(): ApiClient {
  if (!apiClient) {
    apiClient = createApiClient(TVL_ENDPOINTS.BASE_URL);
  }
  return apiClient;
}

export { TVL_ENDPOINTS };
```

**types.ts** - Category-specific TypeScript types
```typescript
export interface Protocol {
  id: string;
  name: string;
  tvl: number;
}
```

**\*.test.ts** - Test files using setup and types
```typescript
import { initializeTvlTests, TVL_ENDPOINTS } from './setup';
import { Protocol } from './types';

describe('TVL API - Protocols', () => {
  const apiClient = initializeTvlTests();

  it('should return protocols', async () => {
    const response = await apiClient.get<Protocol[]>(TVL_ENDPOINTS.PROTOCOLS);
    expect(response.status).toBe(200);
  });
});
```

## Environment Setup

Add these variables to `defi/.env`:

```bash
BASE_API_URL='https://api.llama.fi'
BETA_API_URL='https://api.llama.fi'
BETA_COINS_URL='https://coins.llama.fi'
BETA_STABLECOINS_URL='https://stablecoins.llama.fi'
BETA_YIELDS_URL='https://yields.llama.fi'
BETA_BRIDGES_URL='https://bridges.llama.fi'
BETA_PRO_API_URL='https://pro-api.llama.fi'
```

## Running Tests

From `defi` directory:
```bash
npm run test:api              # Run all API tests
npm run test:api:watch        # Watch mode
npm run test:api:coverage     # With coverage
```

## Adding New Category

1. **Create folder**: `src/your-category/`

2. **Add endpoint** in `utils/config/endpoints.ts`:
```typescript
export const YOUR_ENDPOINTS = {
  BASE_URL: BASE_URLS.YOUR_CATEGORY,
  ENDPOINT: '/path',
} as const;
```

3. **Create `setup.ts`**:
```typescript
import { createApiClient, ApiClient } from '../../utils/config/apiClient';
import { YOUR_ENDPOINTS } from '../../utils/config/endpoints';

let apiClient: ApiClient | null = null;

export function initializeYourTests(): ApiClient {
  if (!apiClient) {
    apiClient = createApiClient(YOUR_ENDPOINTS.BASE_URL);
  }
  return apiClient;
}

export { YOUR_ENDPOINTS };
```

4. **Create `types.ts`** with category-specific types

5. **Write tests** using the setup and types

## Available Helpers

**utils/testHelpers.ts**
- `expectSuccessfulResponse(response)` - Check 2xx status
- `expectArrayResponse(response)` - Validate array response
- `expectNonEmptyArray(data)` - Check array has items
- `expectValidNumber(value)` - Validate number
- `expectNonNegativeNumber(value)` - Check value >= 0
- `expectValidTimestamp(timestamp)` - Validate Unix timestamp

**utils/validators.ts**
- `validateProtocol(protocol)` - Validate protocol structure
- `validateChartDataPoint(point)` - Validate chart data
- `validateArray(data, validator)` - Validate array with custom validator

## CI/CD

**Jenkins**
```groovy
stage('API Tests') {
  steps {
    sh 'cd defi && npm run test:api'
  }
}
```

**GitHub Actions**
```yaml
- run: cd defi && npm run test:api
```

## API Docs

https://api-docs.defillama.com/
