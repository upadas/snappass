# SnapPass

SnapPass is a simple passport, visa, and ID photo maker prototype. It uses static HTML, CSS, and browser JavaScript, with a tiny Node server for platforms that expect a web process.

## AI Photo Agent

The OpenAI key is server-side only. Set these environment variables in your hosting provider or local shell:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-1
```

`OPENAI_MODEL` powers passport photo analysis through the Responses API. `OPENAI_IMAGE_MODEL` powers background replacement through the Images edit API. If `OPENAI_API_KEY` is not set, SnapPass still runs with a server fallback that previews background replacement using the browser mask.

## Run Locally

```bash
npm start
```

Then open `http://localhost:3000`.

## Test

```bash
npm test
```

## Deploy

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

Vercel can serve the static files directly.

1. Import `upadas/snappass`.
2. Leave build command empty.
3. Use `.` as the output directory.
4. Add the AI variables in Vercel project environment variables if you deploy the Node API path.

## Domain

Recommended domain: `snappass.me`.
