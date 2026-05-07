const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const samplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA/UlEQVR4nO3QQQ3AIADAQMAAivALDbwQfUTS0e1l5w6wwfXcA/gbC8hYQMLSgISlAQlLAxKWBqQsDUhYGpCwNCBhaUDC0oCEpQEJSwMSlgYkLA1IWJqwXjJLm3fX6Gc9mS69xgI7C8hYQMLSgISlAQlLAxKWBqQsDUhYGpCwNCBhaUDC0oCEpQEJSwMSlgYkLA1IWJqwXnK8wL2dWcKcHYFkLA1IWJqQsDQgYWlAwtKAhKUBCUsDEpYGJCwNSFga0L0BdBRvrMlIzeUAAAAASUVORK5CYII=',
  'base64'
);

const appUrl = `file://${path.resolve(__dirname, 'index.html')}`;

const uploadSample = async (page, name = 'portrait.png') => {
  await page.setInputFiles('#photoInput', {
    name,
    mimeType: 'image/png',
    buffer: samplePng
  });
  await page.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
};

const run = async () => {
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
      hasPhoto: document.querySelector('#photoFrame').classList.contains('has-photo')
    }));
    assert.equal(uploaded.exportHidden, false);
    assert.equal(uploaded.status, 'Preview ready');
    assert.equal(uploaded.hasPhoto, true);

    await page.selectOption('#backgroundMode', 'replace-white');
    const backgroundState = await page.evaluate(() => ({
      mode: document.querySelector('#backgroundMode').value,
      whitePreview: document.querySelector('#photoFrame').classList.contains('background-white'),
      subjectMask: document.querySelector('#photoFrame').classList.contains('subject-mask'),
      backgroundText: document.querySelector('[data-check="background"]').textContent.trim()
    }));
    assert.equal(backgroundState.mode, 'replace-white');
    assert.equal(backgroundState.whitePreview, true);
    assert.equal(backgroundState.subjectMask, true);
    assert.equal(backgroundState.backgroundText, 'Background: plain white');

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
