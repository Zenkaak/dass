# DASNET

DASNET is a seller-first, multi-tenant commerce platform. Each seller has a separate account, catalogue, storefront URL and order workspace.

## Current implemented scope

- Phone-based seller registration, SMS verification, login, password reset and session handling.
- Path-based storefronts at `/<merchant-slug>`; the public landing page does not expose a global product catalogue.
- Tenant-scoped product records for physical products, data bundles and digital products.
- Seller catalogue management: create, edit, publish, hide and delete products.
- Public customer checkout that validates Kenyan mobile numbers, reloads current prices and availability from the database, and records pending orders.
- Seller order list and status updates.
- Shop name and description settings.
- Tenant-scoped audit events for shop settings, product changes and order status changes.
- Platform admin API and dashboard, protected by an environment allowlist.

## Platform admin setup

Set `DAS_PLATFORM_ADMIN_PHONES` in the DASNET Vercel project to a comma-separated list of already-registered administrator phone numbers. Use Kenyan international or local digits (for example `0758884861` or `+254758884861`); the API converts both forms to the same canonical Kenyan number before comparison. After changing this variable, redeploy the production project for the running API to read the updated allowlist. Only allowlisted users with a valid DASNET session can access `/platform-admin`. Admin actions can activate or suspend a tenant and are audit logged.

## Required database setup

Apply migrations in order to the Neon database used by the DASNET deployment:

1. `db/migrations/0001_initial_schema.sql`
2. `db/migrations/0002_seller_auth_sms.sql`

The migration files define users, tenants, memberships, sites, products, orders, payments, subscriptions and audit records. Confirm the migration completed successfully before using the application.

## Still not implemented / not enabled

- Automatic import of the Bingw active-offer catalogue. Bingw is a separate application/repository and must not be modified as part of DASNET work.
- Merchant Daraja credential entry, encryption/key management, STK push initiation, callback verification, reconciliation and refunds.
- Live payment collection. Checkout currently creates a pending order only; it does not request or accept money.
- Subscription billing, automatic expiry/renewal and plan enforcement.
- Custom domains and subdomains.
- Full platform-admin reporting, staff roles and advanced audit-log browsing.

## Security and release notes

- Every merchant product/order operation is scoped by the authenticated membership's tenant ID; the API does not trust a client-supplied tenant ID for seller management.
- Public checkout resolves the tenant from the shop slug and validates product IDs and prices against that tenant's active catalogue.
- Payment credentials must never be returned to browser clients or logged.
- Do not enable live payments until provider credentials, encrypted storage, callback verification, idempotency, database migrations and end-to-end reconciliation have been independently tested.

DASNET must not be described as production-ready until the remaining items above have been implemented and tested against the production database and payment provider.
