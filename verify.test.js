const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('page contains the approved SnapPass product shell', () => {
  const html = read('index.html');
  assert.match(html, /SnapPass/);
  assert.match(html, /Passport photos that pass the first time/);
  assert.match(html, /Passport photos in a snap\./);
  assert.match(html, /class="brand-tagline">Passport photos in a snap\./);
  assert.match(html, /id="country"/);
  assert.match(html, /id="documentType"/);
  assert.match(html, /id="photoInput"/);
  assert.match(html, /id="exportPanel"/);
});

test('brand includes logo assets and favicon links', () => {
  const html = read('index.html');
  const logo = read('assets/logo.svg');
  const favicon = read('assets/favicon.svg');

  assert.match(html, /rel="icon"/);
  assert.match(html, /href="assets\/favicon\.svg"/);
  assert.match(html, /src="assets\/logo\.svg"/);
  assert.match(logo, /SnapPass logo/);
  assert.match(logo, /passport/i);
  assert.match(favicon, /SnapPass favicon/);
});

test('site positioning is free with minimal ad support', () => {
  const html = read('index.html');
  const css = read('styles.css');

  assert.match(html, /Free to use/);
  assert.match(html, /Ad-supported/);
  assert.match(html, /class="ad-slot"/);
  assert.match(css, /\.ad-slot/);
});

test('stylesheet defines the approved visual system and responsive layout', () => {
  const css = read('styles.css');
  assert.match(css, /--color-primary:\s*#167f63/);
  assert.match(css, /--color-ink:\s*#10251f/);
  assert.match(css, /\.hero-grid/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});

test('script wires upload preview and export state behavior', () => {
  const js = read('app.js');
  assert.match(js, /photoInput\.addEventListener\('change'/);
  assert.match(js, /URL\.createObjectURL/);
  assert.match(js, /exportPanel\.hidden\s*=\s*false/);
  assert.match(js, /resetButton\.addEventListener\('click'/);
});

test('export buttons download digital and printable photo outputs', () => {
  const html = read('index.html');
  const js = read('app.js');

  assert.match(html, /id="downloadDigitalButton"/);
  assert.match(html, /id="downloadPrintButton"/);
  assert.match(js, /downloadDigitalButton\.addEventListener\('click'/);
  assert.match(js, /downloadPrintButton\.addEventListener\('click'/);
  assert.match(js, /downloadCanvas/);
  assert.match(js, /drawImage/);
});

test('zoom and rotation update crop fit warnings', () => {
  const js = read('app.js');

  assert.match(js, /evaluateCropFit/);
  assert.match(js, /setChecklistItem\('head'/);
  assert.match(js, /statusPill\.classList\.toggle\('is-danger'/);
  assert.match(js, /zoomRange\.addEventListener\('input', updatePreviewTransform\)/);
  assert.match(js, /rotateRange\.addEventListener\('input', updatePreviewTransform\)/);
});

test('background replacement controls are available and affect exports', () => {
  const html = read('index.html');
  const js = read('app.js');
  const css = read('styles.css');
  const playwrightTest = read('playwright.test.js');

  assert.match(html, /id="backgroundMode"/);
  assert.match(html, /Replace with white/);
  assert.match(html, /AI cleanup preview/);
  assert.match(js, /backgroundMode\.addEventListener\('change'/);
  assert.match(js, /applyBackgroundMode/);
  assert.match(js, /selectedBackgroundMode/);
  assert.match(js, /fillCanvasBackground/);
  assert.match(js, /drawMaskedSubject/);
  assert.match(css, /subject-mask/);
  assert.match(playwrightTest, /backgroundMode/);
  assert.match(playwrightTest, /replace-white/);
  assert.match(playwrightTest, /subjectMask/);
});

test('prototype includes AI assessment checks for human subject, lighting, and head position', () => {
  const html = read('index.html');
  const js = read('app.js');

  assert.match(html, /id="aiAssessment"/);
  assert.match(html, /Human subject/);
  assert.match(html, /Lighting/);
  assert.match(html, /Head centered/);
  assert.match(html, /Background/);
  assert.match(html, /id="humanWarning"/);
  assert.match(js, /runAiAssessment/);
  assert.match(js, /requestPhotoAnalysis/);
  assert.match(js, /applyAiFindings/);
  assert.match(js, /humanWarning\.hidden\s*=\s*!isLikelyNotHuman/);
  assert.match(js, /isLikelyNotHuman/);
});

test('server exposes private AI photo agent endpoints', () => {
  const server = read('server.js');

  assert.match(server, /OPENAI_API_KEY/);
  assert.match(server, /\/api\/photo\/analyze/);
  assert.match(server, /\/api\/photo\/background/);
  assert.match(server, /responses/);
  assert.match(server, /images\/edits/);
  assert.match(server, /do not change facial features/i);
});

test('browser keeps the OpenAI key on the server and requests agent help in the background', () => {
  const js = read('app.js');
  const html = read('index.html');

  assert.doesNotMatch(js, /OPENAI_API_KEY/);
  assert.match(js, /fetch\('\/api\/photo\/analyze'/);
  assert.match(js, /fetch\('\/api\/photo\/background'/);
  assert.match(js, /applySuggestionButton/);
  assert.match(js, /backgroundResultDataUrl/);
  assert.match(html, /id="applySuggestionButton"/);
});

test('deployment docs explain AI environment variables', () => {
  const readme = read('README.md');
  const envExample = read('.env.example');

  assert.match(readme, /OPENAI_API_KEY/);
  assert.match(readme, /OPENAI_MODEL/);
  assert.match(readme, /server-side/i);
  assert.match(envExample, /OPENAI_API_KEY=/);
  assert.match(envExample, /OPENAI_MODEL=/);
});

test('deployment package supports Render, Railway, and Vercel', () => {
  const packageJson = JSON.parse(read('package.json'));
  const server = read('server.js');
  const renderYaml = read('render.yaml');
  const vercelJson = JSON.parse(read('vercel.json'));

  assert.equal(packageJson.scripts.start, 'node server.js');
  assert.equal(packageJson.scripts['test:source'], 'node --test verify.test.js');
  assert.match(server, /process\.env\.PORT/);
  assert.match(renderYaml, /type:\s*web/);
  assert.match(renderYaml, /startCommand:\s*npm start/);
  assert.equal(vercelJson.cleanUrls, true);
});

test('package includes Playwright browser verification', () => {
  const packageJson = JSON.parse(read('package.json'));
  const playwrightTest = read('playwright.test.js');

  assert.equal(packageJson.scripts['test:source'], 'node --test verify.test.js');
  assert.equal(packageJson.scripts['test:browser'], 'node playwright.test.js');
  assert.equal(packageJson.scripts.test, 'npm run test:source && npm run test:browser');
  assert.match(playwrightTest, /chromium/);
  assert.match(playwrightTest, /downloadDigitalButton/);
  assert.match(playwrightTest, /downloadPrintButton/);
  assert.match(playwrightTest, /Fix crop/);
});
