# DASNET Identity Architecture

## Status

Architecture decision for the DASNET multi-tenant marketplace. This document describes the target model and migration requirements. It is not a claim that the database has already been migrated.

## Current source of truth (audited)

- Seller registration, login, password reset, password change and seller sessions: `api/auth.ts`.
- Seller UI: `src/AuthPage.tsx`.
- Buyer registration, login, password reset, profile update and buyer sessions: `api/buyer-auth.ts`.
- Buyer UI: `src/BuyerAuthPage.tsx`.
- Seller authorization and buyer checkout/order authorization: `api/store.ts`.
- Global seller identity: `public.users`; seller-to-shop authorization: `public.memberships`.
- Shop-scoped buyer identity/profile: `public.store_customers`; shop-scoped OTP and sessions: `store_customer_otp_challenges`, `store_customer_sessions`.

## Decision: one global person, shop-scoped relationships

A person has exactly one global identity, keyed by a normalized, verified phone number. The global identity owns the password hash, phone verification state, recovery state and global sessions.

Shop-specific data remains scoped to a tenant:
- Buyer profile and delivery defaults (name/email/address/alternative phone).
- Orders, chats, reviews and customer history.
- Seller membership and role (owner/admin/editor/viewer).

A person can therefore be a buyer in many shops but can have seller membership in only one shop. Buyer profiles are independent per shop and are not capped by the seller membership rule. A buyer login never grants a seller role. Seller APIs must authorize the authenticated global user against that one shop's `memberships` row; the database enforces one membership per seller identity.

## Target schema

- `users`: canonical global account; unique normalized phone; one password hash/salt; verified phone timestamp.
- `auth_sessions`: global opaque session token hashes, expiry, revocation and optional device metadata.
- `memberships`: seller/staff roles scoped to exactly one tenant per global user; a unique index on `user_id` enforces the one-shop seller rule.
- `store_customers`: shop-specific buyer profile, with a required `user_id REFERENCES users(id)`; unique `(tenant_id,user_id)` and unique `(tenant_id,phone)` during compatibility period.
- `store_customer_otp_challenges`: transition to global OTP challenges keyed by phone and purpose; rate limits shared across shops to prevent OTP abuse.
- Orders continue to store immutable customer name/phone/email snapshots, while optionally adding `buyer_user_id` for account history. The order's `tenant_id` remains authoritative for shop privacy.

## Authentication flows

### Sign in to any shop as a buyer
1. Resolve the shop slug to an active tenant server-side.
2. Verify phone and password against `users` only.
3. Issue/reuse a global `auth_sessions` session and set the common HttpOnly, Secure, SameSite cookie.
4. Upsert a `store_customers` profile for the current tenant using the global user ID. Do not copy password hashes into the shop profile.
5. Return only that shop's buyer profile. Buyer order queries always filter by the resolved tenant and authenticated user/profile.

### First buyer registration
1. Verify phone ownership with a rate-limited OTP.
2. If the phone already exists in `users`, do not create another account or overwrite its password. Ask the person to sign in, then create their shop profile.
3. Otherwise create one global user and the current shop's buyer profile in a transaction.
4. Create a global session.

### Seller access
1. Use the same global user and session.
2. Resolve the intended shop from a trusted route/slug.
3. Require a matching `memberships(tenant_id,user_id)` row and enforce its role on every seller API.
4. Never select an arbitrary first membership when a user belongs to multiple shops.

### Password reset/change/logout
- Reset by verified global phone changes the password once for the global identity.
- Revoke all global sessions on reset; on password change revoke other sessions.
- Logout revokes the current global session.
- No tenant-specific buyer password reset remains after migration.

## Safe migration sequence

1. Add nullable `store_customers.user_id` and indexes without dropping any existing columns/tables.
2. Backfill existing buyer profiles to global users by normalized phone. Prefer an existing `users` row where present. For legacy buyer-only phones, create one user only when all profiles share the same verified password hash/salt. Link all matching shop profiles to that user.
3. Detect duplicate phones with conflicting legacy password hashes, unverified phone records, invalid numbers, or email collisions. Produce a reconciliation report; do not silently overwrite an existing seller password or merge identities without verified phone ownership.
4. Update buyer signup/login/reset/profile/session endpoints to use `users` + `auth_sessions`, and upsert tenant profiles. Preserve legacy buyer cookies temporarily for a controlled transition.
5. Update `api/store.ts` checkout, customer order history, buyer chat and session guards to resolve the global session plus the current tenant profile. Enforce tenant filtering on every query.
6. Update frontend to use one auth session and present role-aware navigation: buyer account in a storefront; seller workspace only where membership exists.
7. Validate old sessions, multi-shop accounts, seller-only accounts, buyer-only accounts, dual-role accounts, reset, logout, checkout, order history and tenant isolation.
8. After a monitored compatibility period, revoke legacy buyer sessions and remove legacy password columns/tables only in a separately reviewed migration.

## Security invariants

- Never trust a tenant ID supplied by the browser without resolving and validating the shop route.
- Never copy password hashes from one tenant's buyer row into another tenant.
- Never expose another tenant's buyer profile, orders, chats, addresses or payment details.
- A global session authenticates a person; it does not itself authorize seller operations.
- Every seller operation requires tenant membership and role checks.
- Every buyer operation requires a profile for the current tenant and is constrained to that tenant.
- Keep passwords scrypt-hashed with per-account salts, use constant-time comparisons, store only hashed random session tokens, and apply OTP throttling/attempt limits.
- Use transactions for global user creation plus tenant profile creation to avoid partial accounts.
