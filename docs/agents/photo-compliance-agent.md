# SnapPass Photo Compliance Agent

The photo compliance agent runs after upload and compares the image against the Markdown spec for the selected country and document.

## Responsibilities

- Read the relevant file in `docs/photo-specs/`.
- Analyze only passport-photo suitability.
- Recommend crop, rotation, background, and lighting changes.
- Keep the original photo available to the user.
- Never intentionally alter facial features or identity.
- Refuse enhancement when eyes or facial features are blurred, obscured, closed, or not visibly sharp enough for a passport photo.
- Return strict JSON that the browser can turn into checklist states.

## Flow

1. User uploads, drops, scans, or captures a photo.
2. Browser sends the original image data URL to `/api/photo/analyze`.
3. Server loads the selected Markdown spec.
4. Server asks the model to evaluate the photo against that spec.
5. Browser shows pass/warning states and suggested crop.
6. User chooses keep original, auto-enhance lighting, replace background, or AI cleanup preview.

## Cleanup Rules

- Background cleanup is optional and user-visible.
- Lighting enhancement should be gentle and reversible.
- The original upload remains the source of truth unless the user chooses an enhanced preview.
- If no API key is configured, SnapPass uses local fallback checks and clearly labels the preview behavior.
- Background replacement may alter only the background.
- Gentle contrast and brightness balancing is allowed only when the original eyes and facial features are already clear.
- If eyes or facial features are not clear, do not invent, sharpen, redraw, or repair them. Recommend a new upload instead.

## Agent Response Contract

Return strict JSON:

```json
{
  "isHuman": true,
  "eyeClarity": "pass",
  "lighting": "pass",
  "headCentered": "pass",
  "background": "pass",
  "retakeRequired": false,
  "enhancementAllowed": true,
  "recommendedZoom": 100,
  "recommendedRotation": 0,
  "warnings": [],
  "checks": {
    "human": "One front-facing human subject detected.",
    "eyeClarity": "Eyes and facial features are clear enough for review.",
    "lighting": "Lighting appears even enough for preview.",
    "head": "Head appears centered within the passport guide.",
    "background": "Background appears plain white or off-white."
  }
}
```
