# SnapPass

SnapPass is a simple passport, visa, and ID photo maker prototype. It uses static HTML, CSS, and browser JavaScript, with a tiny Node server for platforms that expect a web process.

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

### Railway

Railway can deploy this repo with Nixpacks.

1. Create a new Railway project from GitHub.
2. Select `upadas/snappass`.
3. Railway will use `npm start`.

### Vercel

Vercel can serve the static files directly.

1. Import `upadas/snappass`.
2. Leave build command empty.
3. Use `.` as the output directory.

## Domain

Recommended domain: `snappass.me`.
