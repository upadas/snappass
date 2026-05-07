const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const samplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA/UlEQVR4nO3QQQ3AIADAQMAAivALDbwQfUTS0e1l5w6wwfXcA/gbC8hYQMLSgISlAQlLAxKWBqQsDUhYGpCwNCBhaUDC0oCEpQEJSwMSlgYkLA1IWJqwXjJLm3fX6Gc9mS69xgI7C8hYQMLSgISlAQlLAxKWBqQsDUhYGpCwNCBhaUDC0oCEpQEJSwMSlgYkLA1IWJqwXnK8wL2dWcKcHYFkLA1IWJqQsDQgYWlAwtKAhKUBCUsDEpYGJCwNSFga0L0BdBRvrMlIzeUAAAAASUVORK5CYII=',
  'base64'
);

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
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  await waitForServer();
  return server;
};

const uploadSample = async (page, name = 'portrait.png') => {
  await page.setInputFiles('#photoInput', {
    name,
    mimeType: 'image/png',
    buffer: samplePng
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
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    assert.match(initial.title, /Passport photos/);
    assert.equal(initial.exportHidden, true);
    assert.equal(initial.overflow, false);

    await uploadSample(page);
    const uploaded = await page.evaluate(() => ({
      exportHidden: document.querySelector('#exportPanel').hidden,
      status: document.querySelector('#statusPill').textContent.trim(),
      hasPhoto: document.querySelector('#photoFrame').classList.contains('has-photo'),
      agentStatus: document.querySelector('#aiStatus').textContent.trim(),
      applySuggestionHidden: document.querySelector('#applySuggestionButton').hidden
    }));
    assert.equal(uploaded.exportHidden, false);
    assert.equal(uploaded.status, 'Preview ready');
    assert.equal(uploaded.hasPhoto, true);
    assert.equal(uploaded.agentStatus, 'AI preview');
    assert.equal(uploaded.applySuggestionHidden, false);

    await page.click('#applySuggestionButton');
    const appliedSuggestion = await page.evaluate(() => ({
      zoom: document.querySelector('#zoomRange').value,
      rotate: document.querySelector('#rotateRange').value
    }));
    assert.equal(appliedSuggestion.zoom, '100');
    assert.equal(appliedSuggestion.rotate, '0');

    await page.selectOption('#backgroundMode', 'replace-white');
    await page.waitForFunction(() => document.querySelector('#backgroundNote').textContent.includes('server fallback'));
    const backgroundState = await page.evaluate(() => ({
      mode: document.querySelector('#backgroundMode').value,
      whitePreview: document.querySelector('#photoFrame').classList.contains('background-white'),
      subjectMask: document.querySelector('#photoFrame').classList.contains('subject-mask'),
      backgroundText: document.querySelector('[data-check="background"]').textContent.trim(),
      backgroundNote: document.querySelector('#backgroundNote').textContent.trim()
    }));
    assert.equal(backgroundState.mode, 'replace-white');
    assert.equal(backgroundState.whitePreview, true);
    assert.equal(backgroundState.subjectMask, true);
    assert.equal(backgroundState.backgroundText, 'Background: plain white');
    assert.match(backgroundState.backgroundNote, /server fallback/);

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
    ]).then(([download]) => download.suggestedFilename());
    assert.equal(printDownload, 'snappass-printable-4x6.png');
    await page.close();

    const warningPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await warningPage.goto(appUrl);
    await uploadSample(warningPage, 'object-dark-busy-offcenter.png');
    const aiWarning = await warningPage.evaluate(() => ({
      aiStatus: document.querySelector('#aiStatus').textContent.trim(),
      humanWarningHidden: document.querySelector('#humanWarning').hidden,
      warningCount: document.querySelectorAll('.ai-check.is-warning').length
    }));
    assert.equal(aiWarning.aiStatus, 'Retake needed');
    assert.equal(aiWarning.humanWarningHidden, false);
    assert.equal(aiWarning.warningCount, 4);
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
