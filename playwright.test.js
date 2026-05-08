const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const portraitSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#f7f7f2"/>
  <circle cx="300" cy="210" r="128" fill="#d79a78"/>
  <path d="M170 190c20-110 235-110 260 0 8-120-260-125-260 0z" fill="#1e2524"/>
  <rect x="190" y="350" width="220" height="230" rx="72" fill="#d9ded9"/>
</svg>`);
const nonPortraitSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#111827"/>
  <rect x="70" y="150" width="460" height="170" fill="#374151"/>
  <rect x="110" y="190" width="70" height="70" fill="#06b6d4"/>
  <rect x="220" y="190" width="70" height="70" fill="#f59e0b"/>
  <rect x="330" y="190" width="70" height="70" fill="#ef4444"/>
  <path d="M80 410h390l55 60H40z" fill="#f97316"/>
  <circle cx="150" cy="485" r="35" fill="#020617"/>
  <circle cx="425" cy="485" r="35" fill="#020617"/>
</svg>`);

const port = 41739;
const appUrl = `http://127.0.0.1:${port}/`;

const waitForServer = async () => {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error('Timed out waiting for local SnapPass server');
};

const startServer = async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: 'ignore'
  });

  await waitForServer();
  return server;
};

const uploadSample = async (page, name = 'portrait.svg', buffer = portraitSvg) => {
  await page.setInputFiles('#photoInput', {
    name,
    mimeType: 'image/svg+xml',
    buffer
  });
  await page.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
  await page.waitForFunction(() => document.querySelector('#aiStatus').textContent.trim() !== 'Analyzing photo...');
};

const run = async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
    await page.goto(appUrl);

    const initial = await page.evaluate(() => ({
      title: document.querySelector('h1').textContent.trim(),
      exportHidden: document.querySelector('#exportPanel').hidden,
      uploadButtonCount: Array.from(document.querySelectorAll('label[for="photoInput"]'))
        .filter((label) => label.offsetParent !== null).length,
      watermark: document.querySelector('#photoStage').textContent,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    assert.match(initial.title, /Passport photos/);
    assert.equal(initial.exportHidden, true);
    assert.equal(initial.uploadButtonCount, 1);
    assert.match(initial.watermark, /Click to upload/);
    assert.equal(initial.overflow, false);

    await uploadSample(page);
    const uploaded = await page.evaluate(() => ({
      exportHidden: document.querySelector('#exportPanel').hidden,
      status: document.querySelector('#statusPill').textContent.trim(),
      hasPhoto: document.querySelector('#photoFrame').classList.contains('has-photo'),
      agentStatus: document.querySelector('#aiStatus').textContent.trim(),
      applySuggestionHidden: document.querySelector('#applySuggestionButton').hidden,
      printPreviewHidden: document.querySelector('#printPreviewPanel').hidden,
      printPreviewOpacity: getComputedStyle(document.querySelector('#printPreviewPanel')).opacity,
      printPreviewVisibility: getComputedStyle(document.querySelector('#printPreviewPanel')).visibility,
      printPreviewLabel: document.querySelector('.print-preview-header strong').textContent.trim(),
      adjustmentParent: document.querySelector('#adjustmentPanel').parentElement.className,
      setupBeforeChecks: document.querySelector('.preview-side .wizard-card + .checklist') !== null,
      setupGridColumns: getComputedStyle(document.querySelector('.field-grid')).gridTemplateColumns.split(' ').length,
      actionGridColumns: getComputedStyle(document.querySelector('.stage-actions')).gridTemplateColumns.split(' ').length,
      checklistColumns: getComputedStyle(document.querySelector('.checklist')).gridTemplateColumns.split(' ').length,
      quoteText: window.__snapPassQuote,
      printPreviewWidth: document.querySelector('#printSheetPreview').width,
      printPreviewHeight: document.querySelector('#printSheetPreview').height
    }));
    assert.equal(uploaded.exportHidden, false);
    assert.equal(uploaded.status, 'Preview ready');
    assert.equal(uploaded.hasPhoto, true);
    assert.equal(uploaded.agentStatus, 'AI preview');
    assert.equal(uploaded.applySuggestionHidden, false);
    assert.equal(uploaded.printPreviewHidden, false);
    assert.equal(uploaded.printPreviewOpacity, '0');
    assert.equal(uploaded.printPreviewVisibility, 'hidden');
    assert.equal(uploaded.printPreviewLabel, '4 photos, 2 x 2 in each');
    assert.equal(uploaded.adjustmentParent, 'preview-main');
    assert.equal(uploaded.setupBeforeChecks, true);
    assert.equal(uploaded.setupGridColumns, 2);
    assert.equal(uploaded.actionGridColumns, 2);
    assert.equal(uploaded.checklistColumns, 2);
    assert.ok(uploaded.quoteText.length > 10);
    assert.equal(uploaded.printPreviewWidth, 900);
    assert.equal(uploaded.printPreviewHeight, 600);

    await page.hover('#photoFrame');
    const immediatePreview = await page.evaluate(() => ({
      opacity: getComputedStyle(document.querySelector('#printPreviewPanel')).opacity,
      visibility: getComputedStyle(document.querySelector('#printPreviewPanel')).visibility
    }));
    assert.equal(immediatePreview.opacity, '0');
    assert.equal(immediatePreview.visibility, 'hidden');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#printPreviewPanel')).opacity === '1');

    await page.click('#applySuggestionButton');
    const appliedSuggestion = await page.evaluate(() => ({
      zoom: document.querySelector('#zoomRange').value,
      rotate: document.querySelector('#rotateRange').value
    }));
    assert.equal(appliedSuggestion.zoom, '100');
    assert.equal(appliedSuggestion.rotate, '0');

    const beforeDragTransform = await page.locator('#photoPreview').evaluate((element) => getComputedStyle(element).transform);
    const frameBox = await page.locator('#photoFrame').boundingBox();
    await page.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(frameBox.x + frameBox.width / 2 + 42, frameBox.y + frameBox.height / 2 + 24, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction((previousTransform) => (
      getComputedStyle(document.querySelector('#photoPreview')).transform !== previousTransform
    ), beforeDragTransform);
    const afterDrag = await page.locator('#photoPreview').evaluate((element) => ({
      transform: getComputedStyle(element).transform,
      status: document.querySelector('#statusPill').textContent.trim()
    }));
    assert.notEqual(afterDrag.transform, beforeDragTransform);
    assert.match(afterDrag.status, /Preview ready|Adjust crop|Fix crop/);

    await page.selectOption('#backgroundMode', 'replace-white');
    await page.waitForFunction(() => document.querySelector('#backgroundNote').textContent.includes('server API key'));
    const backgroundState = await page.evaluate(() => ({
      mode: document.querySelector('#backgroundMode').value,
      whitePreview: document.querySelector('#photoFrame').classList.contains('background-white'),
      destructiveMask: document.querySelector('#photoFrame').classList.contains('subject-mask'),
      backgroundText: document.querySelector('[data-check="background"]').textContent.trim(),
      backgroundNote: document.querySelector('#backgroundNote').textContent.trim()
    }));
    assert.equal(backgroundState.mode, 'replace-white');
    assert.equal(backgroundState.whitePreview, true);
    assert.equal(backgroundState.destructiveMask, false);
    assert.equal(backgroundState.backgroundText, 'Background: plain white');
    assert.match(backgroundState.backgroundNote, /server API key/);

    await page.locator('#zoomRange').evaluate((element) => {
      element.value = '80';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const cropWarning = await page.evaluate(() => ({
      status: document.querySelector('#statusPill').textContent.trim(),
      danger: document.querySelector('#statusPill').classList.contains('is-danger'),
      headText: document.querySelector('[data-check="head"]').textContent.trim()
    }));
    assert.equal(cropWarning.status, 'Fix crop');
    assert.equal(cropWarning.danger, true);
    assert.equal(cropWarning.headText, 'Headshot out of range');

    const digitalDownload = await Promise.all([
      page.waitForEvent('download'),
      page.click('#downloadDigitalButton')
    ]).then(([download]) => download.suggestedFilename());
    assert.equal(digitalDownload, 'snappass-digital-photo.png');

    const printDownload = await Promise.all([
      page.waitForEvent('download'),
      page.click('#downloadPrintButton')
    ]).then(async ([download]) => ({
      filename: download.suggestedFilename(),
      path: await download.path()
    }));
    assert.equal(printDownload.filename, 'snappass-printable-4x6.png');
    const printBytes = require('node:fs').readFileSync(printDownload.path);
    assert.equal(printBytes.readUInt32BE(16), 1800);
    assert.equal(printBytes.readUInt32BE(20), 1200);
    await page.close();

    const warningPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await warningPage.goto(appUrl);
    await uploadSample(warningPage, 'city-street.svg', nonPortraitSvg);
    const aiWarning = await warningPage.evaluate(() => ({
      aiStatus: document.querySelector('#aiStatus').textContent.trim(),
      humanWarningHidden: document.querySelector('#humanWarning').hidden,
      humanCheck: document.querySelector('[data-ai-check="human"]').textContent.trim(),
      warningCount: document.querySelectorAll('.ai-check.is-warning').length
    }));
    assert.equal(aiWarning.aiStatus, 'Retake needed');
    assert.equal(aiWarning.humanWarningHidden, false);
    assert.match(aiWarning.humanCheck, /No clear human face area detected/);
    assert.ok(aiWarning.warningCount >= 1);
    await warningPage.close();
  } finally {
    await browser.close();
    server.kill();
  }
};

run()
  .then(() => {
    console.log('Playwright checks passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
