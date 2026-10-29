# DAS.co.ke

A new multi-tenant commerce and business-site platform. This repository is built from scratch; the Bingw application is a payment-integration reference only.

## Architecture
- TypeScript application
- Neon PostgreSQL for shared, tenant-scoped data
- Tenant-aware merchant sites, catalogues, orders, and settings
- Server-side M-PESA Daraja integration with verified callbacks and idempotency
- Subscription and platform-admin controls

## Security principles
- Resolve tenant from a validated host/domain mapping, never from a trusted client-supplied tenant ID.
- Authorize every tenant-owned database operation server-side.
- Encrypt merchant payment credentials at rest and never return them to browser clients.
- Do not enable live payments until callback reachability, credentials, schema, and payment flows are tested.

## Status
Initial repository scaffold. Not production-ready; live payments are disabled until the security and integration checks are complete.
