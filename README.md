# SnapPass

SnapPass is a simple passport, visa, and ID photo maker prototype. It uses static HTML, CSS, and browser JavaScript, with a tiny Node server for platforms that expect a web process.

## AI Photo Agent

The OpenAI key is server-side only. The server reads Markdown requirements from `docs/photo-specs/` before asking the model to evaluate or clean up a photo. Set these environment variables in your hosting provider or local shell:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-1
SUPPORT_ALERT_WEBHOOK_URL=https://your-alert-webhook
SUPPORT_ALERT_EMAIL=support@example.com
```

`OPENAI_MODEL` powers passport photo analysis through the Responses API. `OPENAI_IMAGE_MODEL` powers background replacement through the Images edit API. If `OPENAI_API_KEY` is not set, SnapPass still runs with local fallback checks and keeps the original photo available.

If image generation fails because of quota, rate limits, billing, or provider errors, SnapPass records a support alert in server logs and exposes recent alert ids plus sanitized failure messages through `GET /api/photo/agent-status`. `SUPPORT_ALERT_WEBHOOK_URL` can point to Slack, Teams, PagerDuty, or another webhook receiver. `SUPPORT_ALERT_EMAIL` is stored in the alert metadata for the production support destination; wire it to an email provider or incident tool when one is chosen.

Production debug check:

```bash
curl https://snappassme.onrender.com/api/photo/agent-status
```

`aiConfigured: true` means the deployed server can see `OPENAI_API_KEY`. If AI cards are blank after an upload, check `recentAlerts[].message`, `recentAlerts[].variantErrors`, and the Render logs for `[SnapPass support alert]`. The endpoint also reports `renderCommit` so you can confirm Render is running the expected Git revision without exposing secrets.

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
WALGREENS_ENVIRONMENT=sandbox
WALGREENS_CREDS_ENDPOINT=https://services-qa.walgreens.com/api/photo/creds/v3
WALGREENS_PLATFORM=web
WALGREENS_TRANSACTION=photocheckoutv2
WALGREENS_APP_VERSION=1.0
WALGREENS_DEVICE_INFO=WEB,1.0
WALGREENS_AFFILIATE_ID=your_affiliate_or_partner_id
WALGREENS_ORDER_ENDPOINT=https://approved-walgreens-endpoint
WALGREENS_4X6_PRODUCT_ID=4x6-print
```

For the first Walgreens phase, SnapPass fetches sandbox upload credentials from `https://services-qa.walgreens.com/api/photo/creds/v3` and uploads the generated 4x6 sheet to Walgreens storage with the returned `sasKeyToken`. Do not commit the Walgreens API key; set it only as a hosting environment variable. Until API key and affiliate id are configured, `/api/print/orders` saves the intent and returns a clear `pending_provider_credentials` response. Until the approved order endpoint is configured, successful sandbox uploads return `pending_walgreens_checkout`. CVS can later plug into the same provider interface.

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

For the current SnapPass codebase, **Render** is the best first production choice because it runs the existing Node server directly, keeps the OpenAI key server-side, and gives straightforward service logs. **Vercel** now works for the static frontend plus `/api/*` serverless routes through the included catch-all function, but heavy AI image edits still need careful timeout and quota monitoring. **Railway** remains a good Node host if the project is already active there. **AWS Amplify** is strong when you want AWS-native scale and controls, but it adds more AWS surface area than this app needs at launch.

Short version: use Render for the least surprising Node deployment, Vercel for fast static hosting plus serverless API, Railway if the service is already running there, and AWS Amplify when AWS ecosystem integration matters more than simplicity.

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

Vercel serves the static files from the repo root and routes `/api/*` through `api/[...path].js`, which reuses the same `server.js` request handler without starting a long-running listener.

1. Import `upadas/snappass`.
2. Framework preset: **Other**.
3. Build command: leave empty.
4. Output directory: `.`.
5. Install command: `npm install`.
6. Add `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`, and any Walgreens variables in **Project Settings > Environment Variables**.
7. Add `snappass.me` under **Project Settings > Domains** after DNS is ready.
8. If Vercel shows `FUNCTION_INVOCATION_FAILED`, open **Project > Deployments > Functions Logs** and check the `/api/[...path]` invocation. The function includes `docs/photo-specs/**`, so missing spec files should not be the cause.

## Domain

Recommended domain: `snappass.me`.
