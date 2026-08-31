# Legal Case MIS Backend

Single Express + TypeScript + MongoDB API serving Super Admin, Administrator, Legal Assistant, Standard User, and Viewer panels through database-backed RBAC.

## Setup

Requirements: Node.js 20+ and MongoDB.

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

The API is available at `http://localhost:4000/api/v1`, health is at `/health`, Swagger UI is at `/api-docs`, and the raw OpenAPI document is at `/api-docs.json`. Set `MONGO_URI`, JWT secrets, and seed credentials in `.env` before starting.

For MongoDB Atlas, add the development machine or container's outbound IP address to Atlas **Network Access** before running the server. The process connects to MongoDB before opening its HTTP port, and `/health` returns `503` while the database is disconnected.

## Key behavior

- Access tokens use JWT bearer authentication; permissions are resolved from the `Role` collection.
- Case list and detail queries are automatically restricted to assigned/legal-team users unless `case:read:all` is granted.
- Cases, hearings, and documents use soft deletion fields where applicable.
- List responses use `{ success, data, meta }` pagination envelopes.
- `npm run build` performs the strict TypeScript check; `npm run seed` creates system roles, a Super Admin, and sample lookups.

## Project layout

Feature modules live under `src/modules`; `src/routes/index.ts` is the single route composition root. Shared authentication, authorization, errors, pagination, config, and database code live under `src/middleware`, `src/utils`, and `src/config`.# legal_case_backend
Legal Case Backend
