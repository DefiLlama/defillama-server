# defillama-server

## Setup
```bash
aws configure
```

## Development
```bash
npm run build # Build with webpack & check for type errors
npm test # Run tests
npm run format # Format code
```

### Local dev server
```bash
npm run serve
```

## Deploy
Just push your changes to the `master` branch.

## Cli
```
export AWS_REGION="eu-central-1" && npx ts-node src/cli/fillOld.ts
```

## DB schema
```
# User
- id
- password

# Address
- address
- chain
- timestamp
- user that submitted it

# User submissions
- address
- chain
```