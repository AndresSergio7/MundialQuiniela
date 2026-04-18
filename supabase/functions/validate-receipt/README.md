# validate-receipt

Edge Function that verifies an Apple or Google in-app purchase receipt
and grants the corresponding entitlement via the idempotent
`grant_entitlement_from_payment` RPC.

## Required environment

```
APPLE_SHARED_SECRET=...                 # App-specific shared secret
GOOGLE_PACKAGE_NAME=com.mundialquiniela # App package name
GOOGLE_SERVICE_ACCOUNT_JSON={...}       # Full service-account JSON
SUPABASE_URL=...                        # auto
SUPABASE_SERVICE_ROLE_KEY=...           # auto
```

## Deploy

```
supabase functions deploy validate-receipt
supabase secrets set APPLE_SHARED_SECRET=xxx GOOGLE_PACKAGE_NAME=xxx \
  GOOGLE_SERVICE_ACCOUNT_JSON="$(cat sa.json)"
```

## Client contract

```
POST /functions/v1/validate-receipt
Authorization: Bearer <user access token>
Body: { "payment_id": "<uuid>" }

→ { "valid": true, "entitlement_id": "<uuid>", "reused": false }
```
