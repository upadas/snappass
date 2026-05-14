# SnapPass Print Provider Agent

This is the integration contract for Walgreens first, then CVS, Walmart, and pharmacy print ordering.

## Goal

Let a user generate a compliant 4x6 sheet, enter a ZIP code, choose a nearby print provider, and send a print request when provider API access is available.

## Required Inputs

- User ZIP code or location permission.
- Selected provider: Walgreens for the first implementation.
- Final 4x6 printable image data URL or provider-ready image URL.
- User contact details required by the provider.
- OAuth or provider API credentials stored only on the server.

## Provider Strategy

- Start with Walgreens because it has the clearest photo-print API path.
- Keep CVS and Walmart behind the same provider interface until partner/API access is approved.
- Use an intermediary provider such as PNI Digital Media or Fujifilm Imagine only when direct public APIs are unavailable.
- Never hard-code unofficial ordering endpoints.

## Current Server Endpoints

- `GET /api/print/providers?zip=75024`: returns the provider list and Walgreens configuration status.
- `POST /api/print/orders`: accepts a Walgreens order intent for the generated 4x6 sheet.

## Walgreens Environment

- `WALGREENS_API_KEY`: server-side Walgreens credential.
- `WALGREENS_ENVIRONMENT`: `sandbox` now, `production` after Walgreens approval.
- `WALGREENS_CREDS_ENDPOINT`: upload credential endpoint, defaulting to `https://services-qa.walgreens.com/api/photo/creds/v3`.
- `WALGREENS_AFFILIATE_ID`: partner or affiliate id when assigned.
- `WALGREENS_ORDER_ENDPOINT`: approved Walgreens order endpoint for the account/environment.
- `WALGREENS_4X6_PRODUCT_ID`: provider product id for a 4x6 print.

## Server Flow

1. User clicks print pickup.
2. Browser sends ZIP code, contact, selected provider, and generated 4x6 sheet to a server endpoint.
3. Server stores the print intent if Walgreens key/affiliate credentials are not ready.
4. Server fetches Walgreens sandbox upload credentials and uploads the generated 4x6 sheet to Walgreens storage.
5. Server searches provider locations after Walgreens credentials are configured.
6. User chooses a store.
7. Server submits the uploaded 4x6 sheet through the approved provider API.
8. Server returns order ID, pickup estimate, and provider confirmation details.

## Current Prototype Boundary

SnapPass can generate the 4x6 sheet, create a Walgreens order intent, and use the Walgreens sandbox credentials endpoint to upload the sheet to Walgreens storage when `WALGREENS_API_KEY` and `WALGREENS_AFFILIATE_ID` are configured. Actual Walgreens checkout submission still requires approved order endpoint details. CVS and Walmart come later through the same provider interface or through PNI Digital Media/Fujifilm Imagine when direct access is not available.
