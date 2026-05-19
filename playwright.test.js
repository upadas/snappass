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
const cropNeededSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#f7f7f2"/>
  <circle cx="450" cy="390" r="155" fill="#d79a78"/>
  <path d="M285 365c32-140 300-140 330 0 5-150-330-150-330 0z" fill="#1e2524"/>
  <rect x="315" y="600" width="270" height="420" rx="78" fill="#d9ded9"/>
</svg>`);
const tooSmallSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#f7f7f2"/>
  <circle cx="250" cy="175" r="96" fill="#d79a78"/>
  <path d="M145 170c22-88 190-88 210 0 4-95-215-98-210 0z" fill="#1e2524"/>
  <rect x="170" y="300" width="160" height="180" rx="54" fill="#d9ded9"/>
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
const variantSvgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#fff"/>
  <circle cx="300" cy="215" r="125" fill="#d79a78"/>
  <path d="M170 195c35-105 230-105 260 0" fill="#1e2524"/>
  <rect x="200" y="355" width="200" height="210" rx="64" fill="#111827"/>
</svg>`).toString('base64');

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
  await page.waitForFunction(() => !document.querySelector('[data-variant="lighting"]').disabled);
  await page.waitForFunction(() => !['Analyzing photo...', 'Preparing options...'].includes(document.querySelector('#aiStatus').textContent.trim()));
};

const uploadRetakeSample = async (page, name, buffer) => {
  await page.setInputFiles('#photoInput', {
    name,
    mimeType: 'image/svg+xml',
    buffer
  });
  await page.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
  await page.waitForFunction(() => document.querySelector('#aiStatus').textContent.trim() === 'Retake needed');
  await page.waitForFunction(() => !['Analyzing photo...', 'Preparing options...'].includes(document.querySelector('#aiStatus').textContent.trim()));
};

const dropSample = async (page, name = 'portrait.svg', buffer = portraitSvg) => {
  await page.evaluate(({ filename, svg }) => {
    const file = new File([svg], filename, { type: 'image/svg+xml' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const stage = document.querySelector('#photoStage');
    stage.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    stage.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    stage.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, { filename: name, svg: buffer.toString('utf8') });
  await page.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
  await page.waitForFunction(() => !document.querySelector('[data-variant="lighting"]').disabled);
  await page.waitForFunction(() => !['Analyzing photo...', 'Preparing options...'].includes(document.querySelector('#aiStatus').textContent.trim()));
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
      dropZoneRole: document.querySelector('#photoStage').getAttribute('role'),
      phoneButton: document.querySelector('#phoneUploadButton').textContent.trim(),
      zoomMax: document.querySelector('#zoomRange').max,
      requirement: document.querySelector('#requirementSummary').textContent.trim(),
      specStrip: document.querySelector('.spec-strip').textContent,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    assert.match(initial.title, /Passport photos/);
    assert.equal(initial.exportHidden, true);
    assert.equal(initial.uploadButtonCount, 1);
    assert.match(initial.watermark, /Click to upload/);
    assert.match(initial.watermark, /drop photo/);
    assert.equal(initial.dropZoneRole, 'button');
    assert.equal(initial.phoneButton, 'Scan QR from phone');
    assert.equal(initial.zoomMax, '250');
    assert.match(initial.requirement, /600 x 600 px minimum/);
    assert.match(initial.requirement, /50-69%/);
    assert.match(initial.requirement, /56-69%/);
    assert.match(initial.specStrip, /Head 50-69%/);
    assert.equal(initial.overflow, false);

    await page.selectOption('#country', 'in');
    const indiaSpec = await page.evaluate(() => ({
      requirement: document.querySelector('#requirementSummary').textContent.trim(),
      pills: Array.from(document.querySelectorAll('[data-spec-pill]')).map((item) => item.textContent.trim()),
      sizeCheck: document.querySelector('[data-check="size"]').textContent.trim(),
      printLabel: document.querySelector('#printPreviewLabel').textContent.trim()
    }));
    assert.match(indiaSpec.requirement, /51 x 51 mm/);
    assert.deepEqual(indiaSpec.pills, ['51 x 51 mm', '600 x 600 px+', 'Full face visible', 'Eyes visible']);
    assert.equal(indiaSpec.sizeCheck, '51 x 51 mm');
    assert.equal(indiaSpec.printLabel, '4 photos, 51 x 51 mm each');
    const indiaSpecResponse = await fetch(`${appUrl}api/photo/spec?country=in&documentType=passport`);
    assert.match((await indiaSpecResponse.json()).markdown, /51 x 51 mm/);
    const agentStatusResponse = await fetch(`${appUrl}api/photo/agent-status`);
    const agentStatus = await agentStatusResponse.json();
    assert.equal(agentStatus.status, 'fallback');
    assert.equal(agentStatus.aiConfigured, false);
    assert.ok(agentStatus.specCount >= 4);
    await page.selectOption('#country', 'us');

    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const stream = canvas.captureStream();
      window.__snapPassCameraRequests = [];
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async (constraints) => {
            window.__snapPassCameraRequests.push(constraints.video.facingMode.ideal);
            return stream;
          }
        }
      });
      HTMLMediaElement.prototype.play = async function play() {};
    });
    await page.click('#cameraButton');
    await page.waitForFunction(() => !document.querySelector('#cameraModal').hidden);
    await page.waitForFunction(() => document.querySelector('#cameraStatus').textContent.includes('Back camera ready'));
    const cameraState = await page.evaluate(() => ({
      modalHidden: document.querySelector('#cameraModal').hidden,
      captureDisabled: document.querySelector('#captureCameraButton').disabled,
      videoHasStream: Boolean(document.querySelector('#cameraVideo').srcObject),
      flipText: document.querySelector('#flipCameraButton').textContent.trim(),
      requestedFacingModes: window.__snapPassCameraRequests
    }));
    assert.equal(cameraState.modalHidden, false);
    assert.equal(cameraState.captureDisabled, false);
    assert.equal(cameraState.videoHasStream, true);
    assert.equal(cameraState.flipText, 'Use front camera');
    assert.deepEqual(cameraState.requestedFacingModes, ['environment']);
    await page.click('#flipCameraButton');
    await page.waitForFunction(() => window.__snapPassCameraRequests.length === 2);
    const flippedCameraState = await page.evaluate(() => ({
      flipText: document.querySelector('#flipCameraButton').textContent.trim(),
      requestedFacingModes: window.__snapPassCameraRequests
    }));
    assert.equal(flippedCameraState.flipText, 'Use back camera');
    assert.deepEqual(flippedCameraState.requestedFacingModes, ['environment', 'user']);
    await page.click('#cancelCameraButton');
    await page.waitForFunction(() => document.querySelector('#cameraModal').hidden);

    const requirementsGuide = await page.evaluate(() => ({
      title: document.querySelector('#passport-checklist-title').textContent.trim(),
      cardCount: document.querySelectorAll('.requirement-card').length,
      detailsCount: document.querySelectorAll('.requirement-card details').length,
      firstOpen: document.querySelector('.requirement-card details').open,
      gridColumns: getComputedStyle(document.querySelector('.requirement-card-grid')).gridTemplateColumns.split(' ').length
    }));
    assert.equal(requirementsGuide.title, '2026 US passport photo checklist');
    assert.equal(requirementsGuide.cardCount, 6);
    assert.equal(requirementsGuide.detailsCount, 6);
    assert.equal(requirementsGuide.firstOpen, false);
    assert.equal(requirementsGuide.gridColumns, 3);

    await page.click('#phoneUploadButton');
    const qrState = await page.evaluate(() => ({
      hidden: document.querySelector('#phoneUploadModal').hidden,
      href: document.querySelector('#phoneUploadLink').href,
      qr: document.querySelector('#phoneUploadQr').src,
      status: document.querySelector('#phoneUploadStatus').textContent.trim()
    }));
    assert.equal(qrState.hidden, false);
    assert.match(qrState.href, /mobile-upload\.html\?session=/);
    assert.match(qrState.qr, /api\.qrserver\.com/);
    assert.match(qrState.status, /Scan this code/);
    const session = new URL(qrState.href).searchParams.get('session');
    const waitingResponse = await fetch(`${appUrl}api/mobile-upload/${session}`);
    assert.deepEqual(await waitingResponse.json(), { status: 'waiting' });
    await page.click('#phoneUploadClose');
    await page.waitForFunction(() => document.querySelector('#phoneUploadModal').hidden);

    await dropSample(page);
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.passport-guide')).opacity) > 0);
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
      cropGuideRemoved: document.querySelector('.crop-guide') === null,
      prepStepCount: document.querySelectorAll('.agent-prep div').length,
      frameAspect: Math.round(document.querySelector('#photoFrame').getBoundingClientRect().width) === Math.round(document.querySelector('#photoFrame').getBoundingClientRect().height),
      stageAspect: Math.round(document.querySelector('#photoStage').getBoundingClientRect().width) === Math.round(document.querySelector('#photoStage').getBoundingClientRect().height),
      frameToStageRatio: document.querySelector('#photoFrame').getBoundingClientRect().width / document.querySelector('#photoStage').getBoundingClientRect().width,
      checkerPadding: Math.round((document.querySelector('#photoStage').getBoundingClientRect().width - document.querySelector('#photoFrame').getBoundingClientRect().width) / 2),
      dropReady: document.querySelector('#photoStage').classList.contains('is-drop-ready'),
      guideVisible: getComputedStyle(document.querySelector('.passport-guide')).opacity !== '0',
      variantHidden: document.querySelector('#variantPanel').hidden,
      variantCount: document.querySelectorAll('.variant-card').length,
      selectedVariant: document.querySelector('.variant-card.is-selected')?.dataset.variant,
      aiVariantDisabled: document.querySelector('[data-variant="ai"]').disabled,
      whiteVariantDisabled: document.querySelector('[data-variant="white"]').disabled,
      aiVariantHasSrc: document.querySelector('#variantAiPreview').hasAttribute('src'),
      whiteVariantHasSrc: document.querySelector('#variantWhitePreview').hasAttribute('src'),
      lightingVariantHasSrc: document.querySelector('#variantLightingPreview').hasAttribute('src'),
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      quoteText: window.__snapPassQuote,
      printPreviewWidth: document.querySelector('#printSheetPreview').width,
      printPreviewHeight: document.querySelector('#printSheetPreview').height,
      frameBackground: getComputedStyle(document.querySelector('#photoFrame')).backgroundColor,
      qualityOriginalBackground: getComputedStyle(document.querySelector('#variantOriginalPreview')).backgroundColor,
      qualityLightingBackground: getComputedStyle(document.querySelector('#variantLightingPreview')).backgroundColor
    }));
    assert.equal(uploaded.exportHidden, false);
    assert.equal(uploaded.status, 'No crop needed');
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
    assert.equal(uploaded.cropGuideRemoved, true);
    assert.equal(uploaded.prepStepCount, 4);
    assert.equal(uploaded.frameAspect, true);
    assert.equal(uploaded.stageAspect, true);
    assert.ok(uploaded.frameToStageRatio > 0.7);
    assert.ok(uploaded.checkerPadding >= 36 && uploaded.checkerPadding <= 56);
    assert.equal(
      await page.locator('#photoPreview').evaluate((element) => getComputedStyle(element).objectFit),
      'contain'
    );
    assert.equal(uploaded.dropReady, false);
    assert.equal(uploaded.guideVisible, true);
    assert.equal(uploaded.variantHidden, false);
    assert.equal(uploaded.variantCount, 4);
    assert.equal(uploaded.selectedVariant, 'original');
    if (uploaded.aiVariantDisabled) {
      assert.equal(uploaded.aiVariantHasSrc, false);
    }
    if (uploaded.whiteVariantDisabled) {
      assert.equal(uploaded.whiteVariantHasSrc, false);
    }
    assert.equal(uploaded.lightingVariantHasSrc, true);
    assert.match(uploaded.advisorSummary, /does not need cropping|Photo dimensions are 600x600|AI|Original|photo/i);
    assert.ok(uploaded.quoteText.length > 10);
    assert.equal(uploaded.printPreviewWidth, 900);
    assert.equal(uploaded.printPreviewHeight, 600);
    assert.equal(uploaded.qualityOriginalBackground, uploaded.frameBackground);
    assert.equal(uploaded.qualityLightingBackground, uploaded.frameBackground);

    const cropPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await cropPage.goto(appUrl);
    await uploadSample(cropPage, 'needs-crop.svg', cropNeededSvg);
    const autoCropState = await cropPage.evaluate(() => ({
      status: document.querySelector('#statusPill').textContent.trim(),
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      zoom: document.querySelector('#zoomRange').value,
      panX: getComputedStyle(document.querySelector('#photoFrame')).getPropertyValue('--preview-pan-x').trim(),
      panY: getComputedStyle(document.querySelector('#photoFrame')).getPropertyValue('--preview-pan-y').trim(),
      headText: document.querySelector('[data-check="head"]').textContent.trim()
    }));
    assert.equal(autoCropState.status, 'Automatic crop');
    assert.match(autoCropState.advisorSummary, /Automatic crop/i);
    assert.ok(Number(autoCropState.zoom) > 100);
    assert.notEqual(autoCropState.panY, '0%');
    assert.match(autoCropState.headText, /Head|crop/i);
    await cropPage.close();

    const rejectPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await rejectPage.goto(appUrl);
    await uploadRetakeSample(rejectPage, 'too-small.svg', tooSmallSvg);
    const rejectedState = await rejectPage.evaluate(() => ({
      status: document.querySelector('#statusPill').textContent.trim(),
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      warning: document.querySelector('#humanWarning').textContent.trim()
    }));
    assert.equal(rejectedState.status, 'Rejected');
    assert.match(rejectedState.advisorSummary, /Minimum photo dimensions are 600x600/i);
    assert.match(rejectedState.warning, /choose a different photo|minimum/i);
    await rejectPage.close();

    await page.hover('#photoFrame');
    const immediatePreview = await page.evaluate(() => ({
      opacity: getComputedStyle(document.querySelector('#printPreviewPanel')).opacity,
      visibility: getComputedStyle(document.querySelector('#printPreviewPanel')).visibility
    }));
    assert.equal(immediatePreview.opacity, '0');
    assert.equal(immediatePreview.visibility, 'hidden');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#printPreviewPanel')).opacity === '1');
    const popoverPosition = await page.evaluate(() => {
      const frame = document.querySelector('#photoFrame').getBoundingClientRect();
      const popover = document.querySelector('#printPreviewPanel').getBoundingClientRect();
      return {
        clearOfFrame: popover.left > frame.right,
        popoverWidth: Math.round(popover.width)
      };
    });
    assert.equal(popoverPosition.clearOfFrame, true);
    assert.ok(popoverPosition.popoverWidth >= 360);

    await page.click('#applySuggestionButton');
    const appliedSuggestion = await page.evaluate(() => ({
      zoom: document.querySelector('#zoomRange').value,
      rotate: document.querySelector('#rotateRange').value
    }));
    assert.equal(appliedSuggestion.zoom, '100');
    assert.equal(appliedSuggestion.rotate, '0');

    await page.locator('#photoFrame').scrollIntoViewIfNeeded();
    const replacementChooser = page.waitForEvent('filechooser');
    await page.locator('#photoFrame').click();
    await (await replacementChooser).setFiles({
      name: 'replacement.svg',
      mimeType: 'image/svg+xml',
      buffer: portraitSvg
    });
    await page.waitForFunction(() => document.querySelector('#photoPreview').alt.includes('replacement.svg'));
    const replacementClearedVariants = await page.evaluate(() => ({
      selectedVariant: document.querySelector('.variant-card.is-selected')?.dataset.variant,
      aiDisabled: document.querySelector('[data-variant="ai"]').disabled,
      whiteDisabled: document.querySelector('[data-variant="white"]').disabled,
      aiHasSrc: document.querySelector('#variantAiPreview').hasAttribute('src'),
      whiteHasSrc: document.querySelector('#variantWhitePreview').hasAttribute('src')
    }));
    assert.equal(replacementClearedVariants.selectedVariant, 'original');
    assert.equal(replacementClearedVariants.aiDisabled, true);
    assert.equal(replacementClearedVariants.whiteDisabled, true);
    assert.equal(replacementClearedVariants.aiHasSrc, false);
    assert.equal(replacementClearedVariants.whiteHasSrc, false);
    await page.waitForFunction(() => !document.querySelector('[data-variant="lighting"]').disabled);
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
      status: document.querySelector('#statusPill').textContent.trim(),
      qualityOriginalTransform: getComputedStyle(document.querySelector('#variantOriginalPreview')).transform,
      qualityLightingTransform: getComputedStyle(document.querySelector('#variantLightingPreview')).transform,
      previewPanX: getComputedStyle(document.querySelector('#photoFrame')).getPropertyValue('--preview-pan-x').trim(),
      previewPanY: getComputedStyle(document.querySelector('#photoFrame')).getPropertyValue('--preview-pan-y').trim(),
      qualityPanX: getComputedStyle(document.querySelector('#variantPanel')).getPropertyValue('--preview-pan-x').trim(),
      qualityPanY: getComputedStyle(document.querySelector('#variantPanel')).getPropertyValue('--preview-pan-y').trim()
    }));
    assert.notEqual(afterDrag.transform, beforeDragTransform);
    assert.notEqual(afterDrag.qualityOriginalTransform, 'none');
    assert.notEqual(afterDrag.qualityLightingTransform, 'none');
    assert.equal(afterDrag.qualityPanX, afterDrag.previewPanX);
    assert.equal(afterDrag.qualityPanY, afterDrag.previewPanY);
    assert.match(afterDrag.status, /Preview ready|Adjust crop|Fix crop/);

    await page.selectOption('#backgroundMode', 'replace-white');
    await page.waitForFunction(() => /Local background preview|AI background cleanup applied|support alert/i.test(document.querySelector('#backgroundNote').textContent));
    const backgroundState = await page.evaluate(() => ({
      mode: document.querySelector('#backgroundMode').value,
      whitePreview: document.querySelector('#photoFrame').classList.contains('background-white'),
      destructiveMask: document.querySelector('#photoFrame').classList.contains('subject-mask'),
      backgroundText: document.querySelector('[data-check="background"]').textContent.trim(),
      backgroundNote: document.querySelector('#backgroundNote').textContent.trim(),
      whiteDisabled: document.querySelector('[data-variant="white"]').disabled,
      whiteHasSrc: document.querySelector('#variantWhitePreview').hasAttribute('src')
    }));
    assert.equal(backgroundState.mode, 'replace-white');
    assert.equal(backgroundState.whitePreview, true);
    assert.equal(backgroundState.destructiveMask, false);
    assert.match(backgroundState.backgroundText, /AI background pending|Background needs review|Background: plain white/);
    assert.match(backgroundState.backgroundNote, /Local background preview|AI background cleanup applied|support alert/i);
    assert.doesNotMatch(backgroundState.backgroundNote, /OPENAI_API_KEY/);
    assert.equal(backgroundState.whiteDisabled, false);
    assert.equal(backgroundState.whiteHasSrc, true);

    await page.selectOption('#lightingMode', 'auto-enhance');
    await page.waitForFunction(() => document.querySelector('[data-check="lighting"]').textContent.includes('Lighting enhanced'));
    const lightingState = await page.evaluate(() => ({
      mode: document.querySelector('#lightingMode').value,
      lightingText: document.querySelector('[data-check="lighting"]').textContent.trim(),
      processedSource: document.querySelector('#photoPreview').src.startsWith('data:image/png')
    }));
    assert.equal(lightingState.mode, 'auto-enhance');
    assert.equal(lightingState.lightingText, 'Lighting enhanced');
    assert.equal(lightingState.processedSource, true);

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

    await page.locator('#zoomRange').evaluate((element) => {
      element.value = '250';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const maxZoomWarning = await page.evaluate(() => ({
      zoom: document.querySelector('#zoomRange').value,
      status: document.querySelector('#statusPill').textContent.trim(),
      danger: document.querySelector('#statusPill').classList.contains('is-danger')
    }));
    assert.equal(maxZoomWarning.zoom, '250');
    assert.equal(maxZoomWarning.status, 'Adjust crop');
    assert.equal(maxZoomWarning.danger, false);

    const zoomFrameBox = await page.locator('#photoFrame').boundingBox();
    await page.mouse.move(zoomFrameBox.x + zoomFrameBox.width / 2, zoomFrameBox.y + zoomFrameBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(zoomFrameBox.x + zoomFrameBox.width / 2, zoomFrameBox.y + zoomFrameBox.height / 2 + 190, { steps: 8 });
    await page.mouse.up();
    const dragState = await page.evaluate(() => {
      const pan = parseFloat(getComputedStyle(document.querySelector('#photoFrame')).getPropertyValue('--preview-pan-y'));
      return {
        pan,
        warning: document.querySelector('#statusPill').textContent.trim()
      };
    });
    assert.ok(Math.abs(dragState.pan) > 24);
    assert.equal(dragState.warning, 'Adjust crop');

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

    await page.fill('#printZip', '75024');
    await page.fill('#printContact', 'user@example.com');
    await page.click('#printOrderButton');
    await page.waitForFunction(() => document.querySelector('#printOrderStatus').textContent.includes('Walgreens order intent saved'));
    const printOrderState = await page.evaluate(() => ({
      status: document.querySelector('#printOrderStatus').textContent.trim(),
      disabled: document.querySelector('#printOrderButton').disabled
    }));
    assert.match(printOrderState.status, /Walgreens order intent saved/);
    assert.equal(printOrderState.disabled, false);

    const printProvidersResponse = await fetch(`${appUrl}api/print/providers?zip=75024`);
    const printProviders = await printProvidersResponse.json();
    assert.equal(printProviders.providers[0].id, 'walgreens');
    assert.equal(printProviders.providers[0].status, 'credentials-needed');
    await page.close();

    const warningPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await warningPage.goto(appUrl);
    await uploadRetakeSample(warningPage, 'city-street.svg', nonPortraitSvg);
    const aiWarning = await warningPage.evaluate(() => ({
      aiStatus: document.querySelector('#aiStatus').textContent.trim(),
      humanWarningHidden: document.querySelector('#humanWarning').hidden,
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      humanCheck: document.querySelector('[data-check="human"]').textContent.trim(),
      headCheck: document.querySelector('[data-check="head"]').textContent.trim(),
      warningCount: document.querySelectorAll('.check-item.is-warning').length
    }));
    assert.equal(aiWarning.aiStatus, 'Retake needed');
    assert.equal(aiWarning.humanWarningHidden, false);
    assert.match(aiWarning.advisorSummary, /No clear human face area detected|Human subject|human passport-style portrait|front-facing human passport photo/i);
    assert.match(aiWarning.humanCheck, /Human subject needs review/);
    assert.match(aiWarning.headCheck, /blocked/);
    assert.ok(aiWarning.warningCount >= 1);
    await warningPage.close();

    const backgroundOnlyPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await backgroundOnlyPage.route('**/api/photo/analyze', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'openai',
          isHuman: true,
          eyeClarity: 'pass',
          lighting: 'pass',
          headCentered: 'pass',
          background: 'warning',
          retakeRequired: true,
          enhancementAllowed: false,
          recommendedZoom: 100,
          recommendedRotation: 0,
          warnings: [
            'Background is not plain white or off-white; it shows blurred room/details and should be replaced.'
          ],
          checks: {
            human: 'Single front-facing human portrait detected.',
            eyeClarity: 'Eyes and facial features are clear.',
            lighting: 'Lighting appears even enough.',
            head: 'Head appears centered.',
            background: 'Background should be replaced with plain white.'
          }
        })
      });
    });
    await backgroundOnlyPage.route('**/api/photo/suggest', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'openai',
          analysis: {
            isHuman: true,
            eyeClarity: 'pass',
            lighting: 'pass',
            headCentered: 'pass',
            background: 'warning',
            retakeRequired: true,
            enhancementAllowed: false,
            recommendedZoom: 100,
            recommendedRotation: 0,
            warnings: [
              'Background is not plain white or off-white; it shows blurred room/details and should be replaced.'
            ],
            checks: {
              human: 'Single front-facing human portrait detected.',
              eyeClarity: 'Eyes and facial features are clear.',
              lighting: 'Lighting appears even enough.',
              head: 'Head appears centered.',
              background: 'Background should be replaced with plain white.'
            }
          },
          variants: {
            aiSuggestedDataUrl: variantSvgDataUrl,
            whiteBackgroundDataUrl: variantSvgDataUrl,
            lightingDataUrl: null
          },
          message: 'Background-only issue: white background variants are ready.'
        })
      });
    });
    await backgroundOnlyPage.goto(appUrl);
    await backgroundOnlyPage.setInputFiles('#photoInput', {
      name: 'portrait-with-bokeh-background.svg',
      mimeType: 'image/svg+xml',
      buffer: portraitSvg
    });
    await backgroundOnlyPage.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
    await backgroundOnlyPage.waitForFunction(() => !['Analyzing photo...', 'Preparing options...'].includes(document.querySelector('#aiStatus').textContent.trim()));
    const backgroundOnlyState = await backgroundOnlyPage.evaluate(() => ({
      aiStatus: document.querySelector('#aiStatus').textContent.trim(),
      humanWarningHidden: document.querySelector('#humanWarning').hidden,
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      backgroundCheck: document.querySelector('[data-check="background"]').textContent.trim(),
      aiDisabled: document.querySelector('[data-variant="ai"]').disabled,
      whiteDisabled: document.querySelector('[data-variant="white"]').disabled,
      aiHasSrc: document.querySelector('#variantAiPreview').hasAttribute('src'),
      whiteHasSrc: document.querySelector('#variantWhitePreview').hasAttribute('src')
    }));
    assert.equal(backgroundOnlyState.aiStatus, 'AI preview', JSON.stringify(backgroundOnlyState));
    assert.equal(backgroundOnlyState.humanWarningHidden, true);
    assert.match(backgroundOnlyState.advisorSummary, /Background-only issue|variants are ready/);
    assert.match(backgroundOnlyState.backgroundCheck, /Background needs review/);
    assert.equal(backgroundOnlyState.aiDisabled, false);
    assert.equal(backgroundOnlyState.whiteDisabled, false);
    assert.equal(backgroundOnlyState.aiHasSrc, true);
    assert.equal(backgroundOnlyState.whiteHasSrc, true);
    await backgroundOnlyPage.close();

    const editFailurePage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await editFailurePage.route('**/api/photo/suggest', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'openai',
          analysis: {
            isHuman: true,
            eyeClarity: 'pass',
            lighting: 'pass',
            headCentered: 'pass',
            background: 'warning',
            retakeRequired: false,
            enhancementAllowed: true,
            warnings: ['Background needs replacement.'],
            checks: {
              human: 'Single front-facing human portrait detected.',
              eyeClarity: 'Eyes and facial features are clear.',
              lighting: 'Lighting appears even enough.',
              head: 'Head appears centered.',
              background: 'Background should be replaced with plain white.'
            }
          },
          variants: {
            aiSuggestedDataUrl: null,
            whiteBackgroundDataUrl: null,
            lightingDataUrl: null
          },
          variantErrors: {
            aiSuggested: 'OpenAI image edit failed: 429 quota exceeded.',
            whiteBackground: 'OpenAI image edit failed: 429 quota exceeded.'
          },
          alertId: 'photo_abc123',
          message: 'AI analysis is ready. Background editing failed; support alert photo_abc123 recorded.'
        })
      });
    });
    await editFailurePage.goto(appUrl);
    await editFailurePage.setInputFiles('#photoInput', {
      name: 'portrait-with-edit-quota-error.svg',
      mimeType: 'image/svg+xml',
      buffer: portraitSvg
    });
    await editFailurePage.waitForFunction(() => !document.querySelector('#exportPanel').hidden);
    await editFailurePage.waitForFunction(() => !['Analyzing photo...', 'Preparing options...'].includes(document.querySelector('#aiStatus').textContent.trim()));
    const editFailureState = await editFailurePage.evaluate(() => ({
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      aiLabel: document.querySelector('[data-variant="ai"]').dataset.emptyLabel,
      whiteLabel: document.querySelector('[data-variant="white"]').dataset.emptyLabel,
      aiDisabled: document.querySelector('[data-variant="ai"]').disabled,
      whiteDisabled: document.querySelector('[data-variant="white"]').disabled,
      whiteHasSrc: document.querySelector('#variantWhitePreview').hasAttribute('src'),
      lightingDisabled: document.querySelector('[data-variant="lighting"]').disabled
    }));
    assert.match(editFailureState.advisorSummary, /support alert photo_abc123|Background editing failed|local background preview/i);
    assert.match(editFailureState.aiLabel, /AI edit failed/);
    assert.equal(editFailureState.whiteLabel, 'Not ready');
    assert.equal(editFailureState.aiDisabled, true);
    assert.equal(editFailureState.whiteDisabled, false);
    assert.equal(editFailureState.whiteHasSrc, true);
    assert.equal(editFailureState.lightingDisabled, false);
    await editFailurePage.close();

    const blurryPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await blurryPage.goto(appUrl);
    await blurryPage.setInputFiles('#photoInput', {
      name: 'blurry-eyes.svg',
      mimeType: 'image/svg+xml',
      buffer: portraitSvg
    });
    await blurryPage.waitForFunction(() => document.querySelector('#aiStatus').textContent.trim() === 'Retake needed');
    const blurryState = await blurryPage.evaluate(() => ({
      aiStatus: document.querySelector('#aiStatus').textContent.trim(),
      humanWarningHidden: document.querySelector('#humanWarning').hidden,
      humanWarning: document.querySelector('#humanWarning').textContent.trim(),
      advisorSummary: document.querySelector('#advisorSummary').textContent.trim(),
      lightingCheck: document.querySelector('[data-check="lighting"]').textContent.trim(),
      aiDisabled: document.querySelector('[data-variant="ai"]').disabled,
      whiteDisabled: document.querySelector('[data-variant="white"]').disabled,
      lightingDisabled: document.querySelector('[data-variant="lighting"]').disabled,
      aiHasSrc: document.querySelector('#variantAiPreview').hasAttribute('src'),
      lightingHasSrc: document.querySelector('#variantLightingPreview').hasAttribute('src')
    }));
    assert.equal(blurryState.aiStatus, 'Retake needed');
    assert.equal(blurryState.humanWarningHidden, false);
    assert.match(blurryState.humanWarning, /eyes|facial features|sharper/i);
    assert.match(blurryState.advisorSummary, /Retake|eyes|facial features|sharper/i);
    assert.match(blurryState.lightingCheck, /Retake|eyes/i);
    assert.equal(blurryState.aiDisabled, true);
    assert.equal(blurryState.whiteDisabled, true);
    assert.equal(blurryState.lightingDisabled, true);
    assert.equal(blurryState.aiHasSrc, false);
    assert.equal(blurryState.lightingHasSrc, false);
    await blurryPage.close();
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
