# DefiLlama API Testing Framework

Type-safe API testing framework for DefiLlama endpoints using Jest and TypeScript.

## Architecture

```
api-tests/
├── jest.config.js
├── src/
│   ├── tvl/          # Example: TVL category
│   │   ├── setup.ts
│   │   ├── types.ts
│   │   └── protocols.test.ts
│   └── ...           # Add more categories
└── utils/
    ├── config/
    ├── testHelpers.ts
    └── validators.ts
```

## Test Structure

Each test file follows this pattern:

### 1. Basic Response Validation (Common)
- Successful response with valid structure
- Required fields present
- Consistent data structure
- Unique identifiers

### 2. Data Validation (Endpoint-specific)
- Core data fields validation
- Sorting/ordering checks
- Nested data structures

### 3. Metadata (Endpoint-specific)
- Categories, chains, timestamps
- URLs, logos, external links
- Relationships (parent protocols, etc.)

### 4. Edge Cases (Endpoint-specific)
- Null/empty values
- Optional fields
- Extreme values (very large/small)

## Environment Setup

Add to `defi/.env`:
```bash
BASE_API_URL='https://api.llama.fi'
BETA_COINS_URL='https://coins.llama.fi'
BETA_STABLECOINS_URL='https://stablecoins.llama.fi'
BETA_YIELDS_URL='https://yields.llama.fi'
BETA_BRIDGES_URL='https://bridges.llama.fi'
BETA_PRO_API_URL='https://pro-api.llama.fi'
```

## Running Tests

```bash
# From defi directory
npm run test:api              # All tests
npm run test:api:watch        # Watch mode
npm run test:api:coverage     # With coverage

# From api-tests directory
npm test                      # All tests
npm test -- src/tvl           # Specific category
```

## Adding New Endpoint Tests

### 1. Create setup.ts
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

### 2. Create types.ts
```typescript
export interface YourType {
  id: string;
  name: string;
  // ... fields
}
```

### 3. Create endpoint.test.ts
```typescript
describe('Category - Endpoint', () => {
  const apiClient = initializeYourTests();
  let response: ApiResponse<YourType[]>;

  beforeAll(async () => {
    response = await apiClient.get(YOUR_ENDPOINTS.ENDPOINT);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(response);
      expectArrayResponse(response);
      expectNonEmptyArray(response.data);
    });

    it('should have required fields', () => {
      expectArrayItemsHaveKeys(response.data, ['id', 'name']);
    });
  });

  describe('Data Validation', () => {
    // Add endpoint-specific validation
  });

  describe('Edge Cases', () => {
    // Add endpoint-specific edge cases
  });
});
```

## Available Helpers

**utils/testHelpers.ts**
- `expectSuccessfulResponse(response)` - Check 2xx
- `expectArrayResponse(response)` - Validate array
- `expectValidNumber(value)` - Check valid number
- `expectNonNegativeNumber(value)` - Check >= 0
- `expectNonEmptyString(value)` - Check non-empty string

**utils/validators.ts**
- `validateProtocol(protocol)` - Validate structure
- `validateArray(data, validator)` - Validate all items

## CI/CD

### Jenkins
```groovy
stage('API Tests') {
  steps {
    sh 'cd defi && npm run test:api'
  }
}
```

### GitHub Actions
```yaml
- run: cd defi && npm run test:api
```

## Best Practices

1. **Cache responses** - Use `beforeAll` to fetch once
2. **Group by purpose** - Basic → Data → Metadata → Edge Cases
3. **Test samples** - Don't iterate all items (use `.slice(0, 10)`)
4. **Combine similar checks** - Don't create separate tests for each field
5. **Keep it simple** - Avoid over-engineering

## API Docs

https://api-docs.defillama.com/
