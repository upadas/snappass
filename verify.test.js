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

test('upload controls live beside the preview placeholder and placeholder uploads', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const js = read('app.js');

  assert.match(html, /id="photoStage"/);
  assert.match(html, /role="button"/);
  assert.match(html, /Click to upload or drop photo/);
  assert.doesNotMatch(html, /Watermark/);
  assert.match(html, /stage-actions/);
  assert.doesNotMatch(html, /class="upload-actions"/);
  assert.match(css, /\.stage-actions/);
  assert.match(css, /\.photo-stage\.is-drop-ready/);
  assert.match(css, /\.upload-watermark/);
  assert.match(js, /photoStage\.addEventListener\('click'/);
  assert.match(js, /photoStage\.addEventListener\('keydown'/);
  assert.match(js, /photoStage\.addEventListener\('drop'/);
  assert.match(js, /loadPhotoFile/);
});

test('brand includes logo assets and favicon links', () => {
  const html = read('index.html');
  const logo = fs.statSync(path.join(root, 'assets/snappass-logo.png'));
  const favicon = fs.statSync(path.join(root, 'assets/favicon.png'));

  assert.match(html, /rel="icon"/);
  assert.match(html, /href="assets\/favicon\.png"/);
  assert.match(html, /src="assets\/snappass-logo\.png"/);
  assert.ok(logo.size > 10000);
  assert.ok(favicon.size > 10000);
});

test('site positioning is free with minimal ad support', () => {
  const html = read('index.html');
  const css = read('styles.css');

  assert.match(html, /Free to use/);
  assert.match(html, /Donations welcome/);
  assert.match(html, /optional donations/);
  assert.match(html, /OpenAI API calls/);
  assert.match(html, /Ad-supported/);
  assert.match(html, /class="ad-slot"/);
  assert.match(css, /\.ad-slot/);
});

test('pricing section includes optional donation monetization', () => {
  const html = read('index.html');
  const css = read('styles.css');

  assert.match(html, /Keep SnapPass free/);
  assert.match(html, /Donate to keep SnapPass free/);
  assert.match(html, /Apple Pay, Google Pay, cards, PayPal, Venmo, Cash App/);
  assert.match(html, /Future print pickup referral revenue/);
  assert.match(html, /data-payment-provider="stripe-or-paypal"/);
  assert.match(css, /\.donation-panel/);
  assert.match(css, /\.donation-amounts/);
  assert.match(css, /\.donate-button/);
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
  const html = read('index.html');
  assert.match(js, /photoInput\.addEventListener\('change'/);
  assert.match(js, /URL\.createObjectURL/);
  assert.match(js, /exportPanel\.hidden\s*=\s*false/);
  assert.match(js, /resetButton\.addEventListener\('click'/);
  assert.match(html, /id="cameraModal"/);
  assert.match(html, /id="cameraVideo"/);
  assert.match(html, /id="captureCameraButton"/);
  assert.match(js, /mediaDevices\?\.getUserMedia/);
  assert.match(js, /captureCameraButton\.addEventListener\('click'/);
  assert.doesNotMatch(js, /cameraButton\.addEventListener\('click', \(\) => \{\s*photoInput\.click\(\);/);
});

test('export buttons download digital and printable photo outputs', () => {
  const html = read('index.html');
  const js = read('app.js');

  assert.match(html, /id="downloadDigitalButton"/);
  assert.match(html, /id="downloadPrintButton"/);
  assert.match(html, /id="printSheetPreview"/);
  assert.match(js, /downloadDigitalButton\.addEventListener\('click'/);
  assert.match(js, /downloadPrintButton\.addEventListener\('click'/);
  assert.match(js, /downloadCanvas/);
  assert.match(js, /drawImage/);
});

test('printable output uses a true 4x6 300 dpi sheet with live preview', () => {
  const js = read('app.js');
  const css = read('styles.css');
  const html = read('index.html');

  assert.match(js, /PRINT_SHEET_WIDTH\s*=\s*1800/);
  assert.match(js, /PRINT_SHEET_HEIGHT\s*=\s*1200/);
  assert.match(js, /DEFAULT_OUTPUT_SIZE\s*=\s*600/);
  assert.match(js, /activeSpec\.outputWidth/);
  assert.match(js, /activeSpec\.outputHeight/);
  assert.match(js, /PRINT_QUOTES/);
  assert.match(js, /selectRandomQuote/);
  assert.match(js, /drawImageCover/);
  assert.match(js, /renderPrintSheetPreview/);
  assert.match(js, /getPrintSheetPositions/);
  assert.match(js, /drawPrintSheet/);
  assert.match(js, /quoteX/);
  assert.match(html, /4 photos, 2 x 2 in each/);
  assert.match(css, /\.print-preview-canvas/);
});

test('working panel keeps upload, AI status, and print preview close together', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const js = read('app.js');

  assert.match(html, /preview-upload-actions/);
  assert.match(html, /for="photoInput">Upload photo/);
  assert.match(html, /class="wizard-card" aria-label="Photo setup"[\s\S]*id="country"[\s\S]*id="documentType"[\s\S]*class="stage-actions preview-upload-actions"/);
  assert.match(html, /id="printPreviewPanel"/);
  assert.match(html, /data-spec-pill="size"/);
  assert.match(html, /id="printPreviewLabel"/);
  assert.match(html, /class="print-preview-popover"/);
  assert.match(html, /class="adjustment-panel" id="adjustmentPanel" hidden[\s\S]*id="zoomRange"[\s\S]*id="rotateRange"/);
  assert.match(css, /\.preview-upload-actions/);
  assert.match(css, /\.photo-stage:hover \.print-preview-popover:not\(\[hidden\]\)/);
  assert.match(css, /left:\s*calc\(100% \+ 18px\)/);
  assert.match(css, /transition:\s*opacity 180ms ease 1s/);
  assert.match(css, /\.preview-main/);
  assert.doesNotMatch(html, /class="crop-guide"/);
  assert.doesNotMatch(css, /\.crop-guide/);
  assert.match(html, /agent-prep/);
  assert.match(css, /\.agent-prep/);
  assert.match(css, /aspect-ratio:\s*1 \/ 1/);
  assert.match(css, /max-height:\s*calc\(100vh - 96px\)/);
  assert.match(js, /const documentSpecs/);
  assert.match(js, /51 x 51 mm/);
  assert.match(js, /applySpecLabels/);
});

test('zoom and rotation update crop fit warnings', () => {
  const js = read('app.js');
  const css = read('styles.css');

  assert.match(js, /evaluateCropFit/);
  assert.match(js, /setChecklistItem\('head'/);
  assert.match(js, /statusPill\.classList\.toggle\('is-danger'/);
  assert.match(js, /zoomRange\.addEventListener\('input', updatePreviewTransform\)/);
  assert.match(js, /rotateRange\.addEventListener\('input', updatePreviewTransform\)/);
  assert.match(js, /previewPanX/);
  assert.match(js, /photoFrame\.addEventListener\('pointerdown'/);
  assert.match(css, /--preview-pan-x/);
});

test('background replacement controls are available and affect exports', () => {
  const html = read('index.html');
  const js = read('app.js');
  const css = read('styles.css');
  const playwrightTest = read('playwright.test.js');

  assert.match(html, /id="backgroundMode"/);
  assert.match(html, /id="lightingMode"/);
  assert.match(html, /Replace with white/);
  assert.match(html, /AI cleanup preview/);
  assert.match(html, /Auto enhance lighting/);
  assert.match(js, /backgroundMode\.addEventListener\('change'/);
  assert.match(js, /lightingMode\.addEventListener\('change'/);
  assert.match(js, /applyBackgroundMode/);
  assert.match(js, /applyLightingMode/);
  assert.match(js, /processPhotoDataUrl/);
  assert.match(js, /selectedBackgroundMode/);
  assert.match(js, /fillCanvasBackground/);
  assert.match(js, /OPENAI_API_KEY|backgroundResultDataUrl/);
  assert.match(js, /backgroundPlain/);
  assert.match(js, /lightingEven/);
  assert.doesNotMatch(js, /looksLikeBackground/);
  assert.doesNotMatch(js, /drawMaskedSubject/);
  assert.doesNotMatch(css, /subject-mask img/);
  assert.match(playwrightTest, /backgroundMode/);
  assert.match(playwrightTest, /replace-white/);
  assert.match(playwrightTest, /destructiveMask/);
});

test('prototype includes AI assessment checks for human subject, lighting, and head position', () => {
  const html = read('index.html');
  const js = read('app.js');

  assert.match(html, /id="aiAssessment"/);
  assert.match(html, /id="advisorSummary"/);
  assert.match(html, /id="variantPanel"/);
  assert.match(html, /AI suggested/);
  assert.match(html, /White background/);
  assert.match(html, /Lighting enhanced/);
  assert.match(html, /passport-guide/);
  assert.match(html, /id="humanWarning"/);
  assert.match(js, /runAiAssessment/);
  assert.match(js, /requestPhotoSuggestion/);
  assert.match(js, /\/api\/photo\/suggest/);
  assert.match(js, /photoVariants/);
  assert.match(js, /applyAiFindings/);
  assert.match(js, /analyzePortraitPixels/);
  assert.match(js, /mergeLocalImageFindings/);
  assert.match(js, /analysisNeedsRetake/);
  assert.match(js, /humanWarning\.hidden\s*=\s*!retakeRequired/);
  assert.match(js, /eyes or facial features/i);
  assert.match(js, /isLikelyNotHuman/);
});

test('site documents print partner and deployment strategy', () => {
  const html = read('index.html');
  const readme = read('README.md');

  assert.match(html, /Print pickup roadmap/);
  assert.match(html, /Walgreens/);
  assert.match(html, /generic print handoff API/);
  assert.match(html, /PNI Digital Media|Fujifilm/);
  assert.match(readme, /Recommended deployment/);
  assert.match(readme, /Railway/);
  assert.match(readme, /Render/);
  assert.match(readme, /Vercel/);
  assert.match(readme, /AWS Amplify/);
});

test('site includes expandable passport photo requirement cards', () => {
  const html = read('index.html');
  const css = read('styles.css');

  assert.match(html, /2026 US passport photo checklist/);
  assert.match(html, /Composition &amp; lighting/);
  assert.match(html, /Pose &amp; expression/);
  assert.match(html, /Clothing &amp; accessories/);
  assert.match(html, /Children &amp; babies/);
  assert.match(html, /Technical specifications/);
  assert.match(html, /Submission readiness/);
  assert.match(html, /<details>/);
  assert.match(html, /Read more/);
  assert.match(css, /\.requirement-card-grid/);
  assert.match(css, /\.example-pair/);
  assert.match(css, /\.mini-photo\.is-good::after/);
  assert.match(css, /\.mini-photo\.is-bad::after/);
});

test('server exposes private AI photo agent endpoints', () => {
  const server = read('server.js');
  const usPassportSpec = read('docs/photo-specs/us-passport.md');
  const indiaPassportSpec = read('docs/photo-specs/in-passport.md');
  const photoAgent = read('docs/agents/photo-compliance-agent.md');
  const printAgent = read('docs/agents/print-provider-agent.md');

  assert.match(server, /OPENAI_API_KEY/);
  assert.match(server, /eyeClarity/);
  assert.match(server, /retakeRequired/);
  assert.match(server, /enhancementAllowed/);
  assert.match(server, /\/api\/photo\/analyze/);
  assert.match(server, /\/api\/photo\/agent-status/);
  assert.match(server, /\/api\/photo\/spec/);
  assert.match(server, /\/api\/photo\/suggest/);
  assert.match(server, /\/api\/photo\/background/);
  assert.match(server, /responses/);
  assert.match(server, /images\/edits/);
  assert.match(server, /readSpecMarkdown/);
  assert.match(server, /handleAgentStatus/);
  assert.match(server, /aiConfigured/);
  assert.match(server, /docs', 'photo-specs/);
  assert.match(server, /do not change facial features/i);
  assert.match(server, /do not invent or sharpen facial details/i);
  assert.match(usPassportSpec, /Head must be centered/);
  assert.match(usPassportSpec, /50-69%/);
  assert.match(usPassportSpec, /56-69%/);
  assert.match(indiaPassportSpec, /51 x 51 mm/);
  assert.match(indiaPassportSpec, /plain white/);
  assert.match(photoAgent, /Keep the original photo available/);
  assert.match(photoAgent, /Refuse enhancement/);
  assert.match(photoAgent, /do not invent, sharpen, redraw, or repair/);
  assert.match(printAgent, /Walmart/);
  assert.match(printAgent, /Walgreens/);
});

test('browser keeps the OpenAI key on the server and requests agent help in the background', () => {
  const js = read('app.js');
  const css = read('styles.css');
  const html = read('index.html');

  assert.doesNotMatch(js, /OPENAI_API_KEY/);
  assert.doesNotMatch(js, /AI suggested photo needs/);
  assert.match(js, /fetch\('\/api\/photo\/analyze'/);
  assert.match(js, /fetch\('\/api\/photo\/background'/);
  assert.match(js, /applySuggestionButton/);
  assert.match(js, /backgroundResultDataUrl/);
  assert.match(js, /preview\.removeAttribute\('src'\)/);
  assert.match(css, /\.variant-card img:not\(\[src\]\)/);
  assert.match(css, /\.variant-card:disabled::before/);
  assert.match(html, /id="applySuggestionButton"/);
});

test('deployment docs explain AI environment variables', () => {
  const readme = read('README.md');
  const envExample = read('.env.example');

  assert.match(readme, /OPENAI_API_KEY/);
  assert.match(readme, /OPENAI_MODEL/);
  assert.match(readme, /server-side/i);
  assert.match(readme, /docs\/photo-specs/);
  assert.match(readme, /photo-compliance-agent/);
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
  assert.match(read('README.md'), /Framework preset: \*\*Other\*\*/);
  assert.match(read('README.md'), /current `server\.js` API is a long-running Node server/);
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
