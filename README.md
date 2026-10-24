# AGL-Hakuhodo Assessment

This repository contains two independent applications for the AGL-Hakuhodo
Senior Full Stack Developer assessment. They have separate dependencies,
configuration, tests, and documentation; the frontend does not depend on or
call the backend.

## Frontend

The frontend preserves the supplied car-inventory challenge starter and its
mocked GraphQL API.

```powershell
cd frontend
npm ci
npm run verify
npm run dev
```

See [frontend/README.md](frontend/README.md) for the challenge requirements and
run instructions. The required verification command is `npm run verify`.

## Backend

The backend ingests NHTSA make and vehicle-type data into a local database and
serves it through GraphQL. Its setup, ingestion, and Docker instructions are in
[backend/README.md](backend/README.md).

## Verification

Install and run each application from its own directory. Each application has
its own tests and verification commands; there is no shared runtime or
cross-application API connection.