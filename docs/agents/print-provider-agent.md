# SnapPass Print Provider Agent

This is the integration contract for future Walmart, Walgreens, CVS, and pharmacy print ordering.

## Goal

Let a user generate a compliant 4x6 sheet, enter a ZIP code, choose a nearby print provider, and send a print request when provider API access is available.

## Required Inputs

- User ZIP code or location permission.
- Selected provider: Walgreens, Walmart, CVS, or generic print API provider.
- Final 4x6 printable image URL.
- User contact details required by the provider.
- OAuth or provider API credentials stored only on the server.

## Provider Strategy

- Start with providers that offer an approved API or partner path.
- Prefer Walgreens first if developer access is approved.
- Use an intermediary provider such as PNI Digital Media or Fujifilm Imagine only when direct public APIs are unavailable.
- Never hard-code unofficial ordering endpoints.

## Server Flow

1. User clicks print pickup.
2. Browser sends ZIP code and selected provider to a server endpoint.
3. Server searches provider locations.
4. User chooses a store.
5. Server uploads the generated 4x6 sheet through an approved provider API.
6. Server returns order ID, pickup estimate, and provider confirmation details.

## Current Prototype Boundary

SnapPass can generate the 4x6 sheet today. Actual Walmart, Walgreens, or CVS order submission requires approved provider credentials and OAuth/API terms before production use.
