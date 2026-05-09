# US Passport Photo Specification

Use this file as the local contract for SnapPass photo analysis and cleanup agents. The rules are intentionally conservative and are based on the US passport and visa photo composition guidance currently used by the app.

## Output

- Digital output must be square.
- Minimum digital size: 600 x 600 pixels.
- Printable paper photo target: 2 x 2 inches.
- Printable 4x6 sheet target: four 2 x 2 inch photos plus blank quote space.

## Subject

- Exactly one human subject.
- Subject must face the camera directly.
- Eyes should be open and visible.
- Expression should be neutral or natural.
- Do not identify the person or infer sensitive attributes.

## Composition

- Head must be centered horizontally.
- Top of head, including hair, to bottom of chin should be 50-69% of total image height.
- Eye line should sit 56-69% of total image height from the bottom of the image.
- Full face must be visible.
- Shoulders may be visible near the bottom edge.

## Background

- Background should be plain white or off-white.
- No shadows, texture, objects, other people, or visible room details.
- Background replacement may alter only the background.

## Lighting And Quality

- Lighting should be even across the face.
- Avoid hard shadows, glare, overexposure, underexposure, blur, filters, and heavy retouching.
- Preserve original facial features, identity, skin texture, hairline, expression, head shape, clothing, and pose.

## Agent Response Contract

Return strict JSON:

```json
{
  "isHuman": true,
  "lighting": "pass",
  "headCentered": "pass",
  "background": "pass",
  "recommendedZoom": 100,
  "recommendedRotation": 0,
  "warnings": [],
  "checks": {
    "human": "One front-facing human subject detected.",
    "lighting": "Lighting appears even enough for preview.",
    "head": "Head appears centered within the passport guide.",
    "background": "Background appears plain white or off-white."
  }
}
```
