# SnapPass Release Notes

Every pushed change should add a short entry here with the date, commit, user-facing change, and verification run.

## 2026-05-13

### `2641707` - Split AI and white background variants

- Separated **AI suggested** from **White background** so each uses its own OpenAI image-edit prompt.
- AI suggested now asks for the safest compliant passport background for the selected spec.
- White background is now a strict background-only white replacement with no lighting, contrast, crop, clothing, or facial changes.
- Verification: `npm test`.

## 2026-05-12

### `139dbf7` - Add Walgreens print handoff

- Added Walgreens as the first server-side retail print provider path.
- Added `/api/print/providers` and `/api/print/orders`.
- Added UI fields for ZIP/contact and a guarded “Request Walgreens pickup” handoff.
- Added Walgreens environment variable documentation.
- Verification: `npm test`.

### `de1b35c` - Require retakes for unclear facial details

- Added `eyeClarity`, `retakeRequired`, and `enhancementAllowed` to the AI analysis contract.
- Disabled AI variants when eyes or facial features are blurred, closed, obscured, or not visibly sharp enough.
- Updated prompts so AI never invents, sharpens, redraws, or repairs facial details.
- Verification: `npm test`.

### `1237965` - Hide unavailable AI variant images

- Fixed broken image icons in AI variant cards.
- Empty unavailable variants now remove the image `src` and show a clean “Not ready” placeholder.
- Added browser coverage for disabled AI variant cards.
- Verification: `npm test`.

## 2026-05-11

### `ca7a3bb` - Add AI agent status endpoint

- Added `/api/photo/agent-status` so production can confirm whether the server sees the OpenAI key.
- Exposed analysis/image model names and available photo endpoints without leaking secrets.
- Verification: `npm test`.

### `1038003` - Open camera capture flow

- Fixed the **Use camera** button so it opens the camera capture modal instead of prompting for file upload.
- Added camera stream handling and browser verification.
- Verification: `npm test`.

### `496f919` - Add dynamic passport specs

- Added country/document-specific spec labels and output sizes.
- India passport now shows 51 x 51 mm instead of US 2 x 2 inch labels.
- Added `/api/photo/spec` to read Markdown-backed requirements.
- Verification: `npm test`.

### `006b8de` - Add optional donation panel

- Added the donation-supported monetization panel.
- Documented ad-supported and optional-donation positioning so SnapPass can remain free to users.
- Verification: `npm test`.

## 2026-05-09

### `821d0ea` - Add AI suggested photo variants

- Added original, AI suggested, white background, and lighting enhanced selection cards.
- Added server-side `/api/photo/suggest` flow for analysis plus optional edited image variants.
- Verification: `npm test`.

### `9ea5ee9` - Add spec-backed photo agent

- Added the Markdown-backed photo compliance agent contract.
- Added server-side OpenAI analysis and background endpoints.
- Preserved the original upload as the default source of truth.
- Verification: `npm test`.

## 2026-05-08

### `9d0a12c` - Support drag/drop photo upload

- Added drag-and-drop upload support on the photo frame.
- Kept click-to-upload behavior for both empty and uploaded states.
- Verification: `npm test`.

### `b83b74c` - Add passport checklist guide

- Added the US passport photo checklist and composition guidance.
- Added expandable requirement cards for lighting, pose, clothing, children, technical specs, and readiness.
- Verification: `npm test`.
