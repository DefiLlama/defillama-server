# RWA Perps

Real-World Assets perpetual futures data aggregation and API service. Collects market data (open interest, volume, funding rates, fees) from Hyperliquid venues, stores historical snapshots in PostgreSQL, and serves them via a cached REST API.

## Architecture

```
Airtable (market metadata)
        v
Hyperliquid API ──> Parse & Validate ──> PostgreSQL
                                           |
                                      Cache (JSON)
                                           |
                                      REST API (:5003)
```

### Data pipeline (`cron.ts` / `perps.ts`)

1. Load market metadata from Airtable (canonical contracts, categories, fees, asset class).
2. Fetch venue markets and funding history from Hyperliquid.
3. Calculate derived metrics: cumulative funding, rolling volumes (7d/30d/all-time), protocol fees.
4. Run circuit-breaker check (rejects >50% OI change).
5. Store snapshots to hourly, daily, and backup DB tables.
6. Generate cache files (`current.json`, `stats.json`, `list.json`, `id-map.json`, per-market charts).

### Database (`create_tables.sql` / `db.ts`)

| Table | Purpose |
|-------|---------|
| `hourly_rwa_perps_data` | Short-lived hourly snapshots (auto-pruned after 2 days) |
| `daily_rwa_perps_data` | Long-term daily snapshots |
| `backup_rwa_perps_data` | Redundant backup of hourly data |
| `meta_rwa_perps_data` | Static market metadata (JSONB) |
| `rwa_perps_funding_history` | Per-interval funding snapshots |

### Platforms

Currently supports **Hyperliquid** (`platforms/hyperliquid.ts`). New platforms can be added as files in `platforms/`.

## API endpoints

All routes are prefixed with `/{RWA_PERPS_SUBPATH}/`.

| Route | Description |
|-------|-------------|
| `GET /current` | All markets, latest snapshot |
| `GET /list` | Contracts, venues, categories |
| `GET /stats` | Aggregate totals by venue & category |
| `GET /id-map` | Canonical market keys to ID mapping |
| `GET /market/:id` | Single market by ID |
| `GET /contract/:contract` | Markets matching a canonical market key from Airtable `Canonical Market ID` (returns array directly) |
| `GET /venue/:venue` | All markets on a venue (returns array directly) |
| `GET /category/:category` | Markets in a category (returns array directly) |
| `GET /chart/:id` | Historical time-series for one market |
| `GET /chart/venue/:venue` | Historical constituent rows for one venue |
| `GET /chart/category/:category` | Historical constituent rows for one category |
| `GET /funding/:id` | Funding history array (supports `startTime`/`endTime` query params) |

`/id-map` currently exposes lowercase canonical market keys and lowercase IDs that resolve to the stored market ID used by `/market/:id` and `/chart/:id`.

Perps Airtable metadata parsing now reuses the shared RWA normalization style for header mapping, whitespace cleanup, dash-to-null handling, and deduped string-array normalization. The perps-specific `accessModel` field still comes directly from the Airtable `Access Model` column.

## Environment variables

| Variable | Description |
|----------|-------------|
| `RWA_PERPS_PORT` | Server port (default: `5003`) |
| `RWA_PERPS_SUBPATH` | API route prefix (required) |
| `RWA_PERPS_CACHE_DIR` | Cache directory (default: `.rwa-perps-cache`) |
| `COINS2_AUTH` | PostgreSQL connection (comma-separated: db, user, password) |
| `RWA_WEBHOOK` | Discord webhook for alerts |

## Running

```bash
# Cron (data pipeline)
pnpm run rwa-perps-cron

# REST server
ts-node --max-old-space-size=4096 defi/src/rwa/perps/server.ts

# Tests
jest defi/src/rwa/perps/perps.test.ts
```

## Deployment

Deployed via Docker + PM2. See `Dockerfile`, `ecosystem.config.js`, and `rwa_perps_start.sh`.
