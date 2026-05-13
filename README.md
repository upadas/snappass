# SnapPass

SnapPass is a simple passport, visa, and ID photo maker prototype. It uses static HTML, CSS, and browser JavaScript, with a tiny Node server for platforms that expect a web process.

## AI Photo Agent

The OpenAI key is server-side only. The server reads Markdown requirements from `docs/photo-specs/` before asking the model to evaluate or clean up a photo. Set these environment variables in your hosting provider or local shell:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-1
```

`OPENAI_MODEL` powers passport photo analysis through the Responses API. `OPENAI_IMAGE_MODEL` powers background replacement through the Images edit API. If `OPENAI_API_KEY` is not set, SnapPass still runs with local fallback checks and keeps the original photo available.

Agent contracts:

- `docs/photo-specs/us-passport.md`: US passport rules for photo analysis and cleanup.
- `docs/agents/photo-compliance-agent.md`: upload-time analysis and cleanup flow.
- `docs/agents/print-provider-agent.md`: future Walmart, Walgreens, CVS, and pharmacy print ordering flow.

## Walgreens Print Handoff

SnapPass includes the first server-side retail print handoff for Walgreens:

- `GET /api/print/providers?zip=75024`
- `POST /api/print/orders`

The browser posts a Walgreens order intent with ZIP/contact details and the generated 4x6 sheet. Real Walgreens submission stays server-side and requires approved provider credentials plus an image URL that Walgreens can fetch.

```bash
WALGREENS_API_KEY=your_walgreens_key
WALGREENS_ORDER_ENDPOINT=https://approved-walgreens-endpoint
WALGREENS_AFFILIATE_ID=your_affiliate_or_partner_id
WALGREENS_4X6_PRODUCT_ID=4x6-print
```

Until those are configured, `/api/print/orders` saves the intent and returns a clear `pending_provider_credentials` response. CVS can later plug into the same provider interface.

## Run Locally

```bash
npm start
```

Then open `http://localhost:3000`.

## Test

```bash
npm test
```

## Release Notes

Add an entry to `RELEASE_NOTES.md` for every pushed commit. Keep each entry short: date, commit hash, user-facing change, and verification command.

## Deploy

## Recommended deployment

For the current SnapPass codebase, **Railway is the best first production choice** because it runs the existing Node server without reshaping the API, starts at a predictable low monthly floor, and keeps the OpenAI key server-side. **Render** is a close second and is often the simplest dashboard experience for a small Node web service. **Vercel** is excellent for static frontend speed, but the current `/api/photo/*` Node server would need to be converted to Vercel serverless routes before production. **AWS Amplify** is strong when you want AWS-native scale and controls, but it adds more AWS surface area than this app needs at launch.

Short version: use Railway for launch, Render if you prefer its dashboard, Vercel after converting the API routes, and AWS Amplify when AWS ecosystem integration matters more than simplicity.

### Render

Use the included `render.yaml` Blueprint.

1. Push this repo to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select `upadas/snappass`.
4. Render will use `npm install` and `npm start`.
5. Add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_IMAGE_MODEL` in **Environment** before production use.

### Railway

Railway can deploy this repo with Nixpacks.

1. Create a new Railway project from GitHub.
2. Select `upadas/snappass`.
3. Railway will use `npm start`.
4. Add the AI variables in Railway service variables.

### Vercel

Vercel is a good choice if you want the fastest path for the static SnapPass frontend. For the full AI agent flow, keep the Node server on Railway/Render or convert `server.js` into Vercel serverless functions before production.

1. Import `upadas/snappass`.
2. Framework preset: **Other**.
3. Build command: leave empty.
4. Output directory: `.`.
5. Install command: `npm install`.
6. Add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_IMAGE_MODEL` in **Project Settings > Environment Variables** if you also deploy API routes.
7. Add `snappass.me` under **Project Settings > Domains** after DNS is ready.
8. Production caveat: the current `server.js` API is a long-running Node server. Railway or Render is the cleaner launch target for full AI cleanup until Vercel API routes are split out.

## Domain

Recommended domain: `snappass.me`.
