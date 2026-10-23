# NHTSA Vehicle Make Service

This independent NestJS service imports NHTSA makes and their vehicle types into SQLite, then exposes the persisted snapshot through GraphQL. It does not connect to the frontend application.

## Requirements

- Node.js 20 or newer and npm
- Docker Desktop only for the container workflow

## Local setup

From `backend/`:

```powershell
Copy-Item .env.example .env
npm ci
npm run build
npm run db:migrate
npm run ingest
npm start
```

The GraphQL endpoint is `http://localhost:4000/graphql`. `npm run start:dev` runs the server in watch mode after the first build and ingestion. `DATABASE_PATH` defaults to `./data/nhtsa.sqlite` relative to this directory.

## Ingestion

`npm run ingest` fetches GetAllMakes once, validates its response, and requests vehicle types for each distinct valid make ID. The implementation follows the live XML names `AllVehicleMakes`, `Make_ID`, and `Make_Name`; the inspected response returned 12,412 records on 2026-10-23. The make-440 type endpoint returned `VehicleTypesForMakeIds`, `VehicleTypeId`, and `VehicleTypeName`.

Requests use a bounded worker pool and bounded retries. The inspected GetAllMakes response did not include a rate-limit header. HTTP 408, 429, 5xx, timeouts, and network failures are retried; a valid `Retry-After` on 429 is honored only up to the configured limit, otherwise ingestion stops rather than retrying too early. Permanent 4xx responses and malformed XML are not retried.

All make/type responses are parsed and validated before persistence. An incomplete or unexpectedly empty make list does not replace the current data. The full snapshot and `lastSuccessfulIngestionAt` metadata are written in one SQLite transaction. Failures leave both the prior snapshot and timestamp unchanged.

## Configuration

Copy `.env.example` to `.env`. Settings are validated at startup:

| Variable | Default | Allowed range |
| --- | ---: | ---: |
| `PORT` | `4000` | 1-65535 |
| `DATABASE_PATH` | `./data/nhtsa.sqlite` | non-empty path |
| `NHTSA_MAX_CONCURRENCY` | `5` | 1-8 |
| `NHTSA_REQUEST_TIMEOUT_MS` | `10000` | 1000-60000 |
| `NHTSA_MAX_RETRIES` | `2` | 0-5 retries after the first request |
| `NHTSA_RETRY_BASE_DELAY_MS` | `500` | 0-5000 |
| `NHTSA_RETRY_MAX_DELAY_MS` | `5000` | 0-10000 |

Retry delay is capped by the maximum. The base delay cannot exceed the maximum. Do not increase concurrency or retry limits without checking current NHTSA behavior.

## Data model

- `makes`: NHTSA make ID primary key and name.
- `vehicle_types`: make foreign key, type ID/name, composite primary key `(make_id, type_id)`; indexed by type ID.
- `ingestion_status`: one metadata row with UTC ISO-8601 success time, counts, and run ID.

SQLite is sufficient for this single-service assessment: it provides durable relational constraints without a separate database server. A single joined query assembles makes and vehicle types, avoiding GraphQL N+1 reads. `DatabaseService` creates missing tables at startup; `npm run db:migrate` explicitly initializes them as part of setup.

## GraphQL

The typed schema is in [`docs/schema.graphql`](docs/schema.graphql). The required response shape is preserved:

```graphql
query {
  makes {
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
  }
}
```

Freshness is separate from make records:

```graphql
query {
  ingestionStatus {
    lastSuccessfulIngestionAt
    makeCount
    vehicleTypeCount
    runId
  }
}
```

Before the initial successful ingestion, `makes` is empty and the status timestamp/run ID are `null`.

## Docker

From `backend/`:

```powershell
Copy-Item .env.example .env
docker compose build
docker compose run --rm backend npm run db:migrate
docker compose run --rm backend npm run ingest
docker compose up -d backend
docker compose logs -f backend
```

Compose mounts `./data` at `/app/data`, so the SQLite snapshot survives container restarts and recreation. Verify it by querying GraphQL, running `docker compose restart backend`, and querying again. The local database directory is ignored by Git.

## Tests and checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Tests use fixture XML and mocked HTTP calls; they cover malformed/missing/empty data, retries, bounded concurrency, successful persistence, GraphQL output, and preservation of data and freshness after failures.

## Troubleshooting

- A startup validation error names the invalid setting; check `.env` values against the table.
- An ingestion error lists the failed make IDs and leaves the prior database snapshot intact.
- If `DATABASE_PATH` points to a new location, run `npm run db:migrate` and `npm run ingest` again.
- For Docker persistence issues, confirm `./data` is mounted and writable; the container runs as the non-root `node` user.
- `Retry-After` beyond `NHTSA_RETRY_MAX_DELAY_MS` stops the run intentionally; rerun ingestion later rather than retrying sooner than requested.