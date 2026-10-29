# DAS.co.ke

DAS.co.ke is a seller-first, multi-tenant commerce platform inspired by the seller experience of Bingwa Sokoni. The first release focuses on merchant registration, a unique shop URL, product listings, order management and merchant-specific payment setup.

## First-release experience
- Public landing page explains the platform and has clear **Sign up** and **Go to dashboard** actions.
- Each merchant's storefront is served at `das.co.ke/<merchant-slug>`.
- The public landing page does **not** show product listings. The catalogue appears only inside a merchant storefront.
- Support both data bundles/digital offers and ordinary physical shop products.
- Start with the existing Bingw active offers as the initial data-bundle catalogue, then let each merchant manage their own listings. The source catalogue still needs to be imported into the tenant-scoped database; sample UI cards are not live product records.
- Subdomains and additional capabilities can be added after the path-based storefront flow is working.

## Architecture
- TypeScript + React application
- Neon PostgreSQL for shared, tenant-scoped data
- Tenant-aware merchant sites, catalogues, orders, and settings
- Server-side M-PESA Daraja integration with verified callbacks and idempotency
- Subscription and platform-admin controls

## Security principles
- Resolve tenant from a validated path slug or host/domain mapping; never trust a client-supplied tenant ID.
- Authorize every tenant-owned database operation server-side.
- Encrypt merchant payment credentials at rest and never return them to browser clients.
- Do not enable live payments until callback reachability, credentials, schema, and payment flows are tested.

## Status
The current frontend contains the seller-first landing page, path-based storefront layout and placeholder account pages. Registration, dashboard authentication, tenant-scoped catalogue loading, source-offer import, order persistence and payment processing are not yet connected. The initial SQL migration has not been applied or validated against Neon. This is not production-ready; live payments remain disabled until the required checks pass.
