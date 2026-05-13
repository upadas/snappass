# SnapPass Print Provider Agent

This is the integration contract for Walgreens first, then CVS, Walmart, and pharmacy print ordering.

## Goal

Let a user generate a compliant 4x6 sheet, enter a ZIP code, choose a nearby print provider, and send a print request when provider API access is available.

## Required Inputs

- User ZIP code or location permission.
- Selected provider: Walgreens for the first implementation.
- Final 4x6 printable image URL.
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
- `WALGREENS_ORDER_ENDPOINT`: approved Walgreens order endpoint for the account/environment.
- `WALGREENS_AFFILIATE_ID`: partner or affiliate id when assigned.
- `WALGREENS_4X6_PRODUCT_ID`: provider product id for a 4x6 print.

## Server Flow

1. User clicks print pickup.
2. Browser sends ZIP code, contact, selected provider, and generated 4x6 sheet to a server endpoint.
3. Server stores the print intent if provider credentials or public image storage are not ready.
4. Server searches provider locations after Walgreens credentials are configured.
5. User chooses a store.
6. Server submits the generated 4x6 sheet through the approved provider API.
7. Server returns order ID, pickup estimate, and provider confirmation details.

## Current Prototype Boundary

SnapPass can generate the 4x6 sheet and create a Walgreens order intent today. Actual Walgreens order submission requires approved provider credentials, provider endpoint details, and a public or signed image URL that the Walgreens API can fetch. CVS and Walmart come later through the same provider interface or through PNI Digital Media/Fujifilm Imagine when direct access is not available.
