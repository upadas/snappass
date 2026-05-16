# SnapPass Release Notes

Every pushed change should add a short entry here with the date, commit, user-facing change, and verification run.

## 2026-05-16

### `pending` - Fill preview gaps with compliant background

- Preview gaps from contained, zoomed-out, or panned photos now use the same compliant passport-slot background as exports.
- Quality-check preview cards now match the live preview background, so empty margins do not show a different tint.
- Canvas exports continue to paint the same selected compliant background before drawing the adjusted photo.
- Verification: `node --check app.js`, `npm run test:source`, and `npm run test:browser`.

## 2026-05-14

### `9f9dc55` - Sync crop adjustments into quality previews

- Quality-check preview cards now use the same pan, zoom, and rotate crop variables as the main passport photo preview.
- Dragging or slider changes in the uploader immediately move the original and lighting-enhanced quality images in the same pattern.
- Increased high-zoom pan limits so users can align the head to the passport guide at up to 250% zoom.
- Added safer production AI diagnostics to `/api/photo/agent-status`, including sanitized recent alert messages, variant errors, and Render commit id.
- Documented how to check Render AI agent health without exposing API keys.
- Verification: `node --check app.js`, `npm run test:source`, and `npm run test:browser`.

## 2026-05-13

### `5a21f4c` - Add adjusted previews and Walgreens sandbox upload

- Zoom now supports up to 250% while still warning when the crop moves outside the passport guide.
- AI analysis, AI suggestions, white-background cleanup, and bottom preview cards now use the user-adjusted photo position instead of a separate raw upload view.
- Added Walgreens sandbox upload-credential support through `https://services-qa.walgreens.com/api/photo/creds/v3`, then uploads the generated 4x6 sheet to the returned storage URL when credentials are configured.
- Documented the sandbox environment variables while keeping the Walgreens API key out of source.
- Verification: `node --check app.js`, `node --check server.js`, and `npm test`.

### `cdc2292` - Surface AI edit failures and avoid initial crop

- Uploaded photos now start contained inside the preview slot instead of being cropped on first load.
- Digital and print canvas output starts from the same contained image fit so users control zoom/pan before export.
- AI variant cards now show explicit edit-failure labels instead of silent empty “Not ready” slots.
- Added support alert recording for OpenAI image edit failures, with optional webhook routing and recent alert ids in agent status.
- Verification: `node --check app.js`, `node --check server.js`, and `npm test`.

### `a6d59d7` - Allow background-only AI cleanup

- Background-only failures now stay eligible for **AI suggested** and **White background** variants.
- Retake gating is limited to non-human subjects, unclear eyes, or unclear facial features.
- Normalized AI analysis flags so a bokeh/room background does not incorrectly become “Retake needed.”
- Added browser coverage for the exact case where the face and eyes are clear but the background must be replaced.
- Verification: `node --check app.js`, `node --check server.js`, and `npm test`.

### `41d1464` - Clear generated variants on reupload

- Clears stale **AI suggested**, **White background**, and **Lighting enhanced** previews as soon as a replacement photo is uploaded.
- Re-selects **Original** for the new upload while the agent regenerates fresh variants.
- Added browser coverage so generated variant cards must be empty and disabled immediately after reupload.
- Verification: `node --check app.js` and `npm test`.

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
