const country = document.querySelector('#country');
const documentType = document.querySelector('#documentType');
const requirementSummary = document.querySelector('#requirementSummary');
const photoInput = document.querySelector('#photoInput');
const photoStage = document.querySelector('#photoStage');
const photoFrame = document.querySelector('#photoFrame');
const photoPreview = document.querySelector('#photoPreview');
const statusPill = document.querySelector('#statusPill');
const checklist = document.querySelector('#checklist');
const adjustmentPanel = document.querySelector('#adjustmentPanel');
const exportPanel = document.querySelector('#exportPanel');
const zoomRange = document.querySelector('#zoomRange');
const rotateRange = document.querySelector('#rotateRange');
const zoomValue = document.querySelector('#zoomValue');
const rotateValue = document.querySelector('#rotateValue');
const resetButton = document.querySelector('#resetButton');
const cameraButton = document.querySelector('#cameraButton');
const aiStatus = document.querySelector('#aiStatus');
const humanWarning = document.querySelector('#humanWarning');
const aiAssessment = document.querySelector('#aiAssessment');
const downloadDigitalButton = document.querySelector('#downloadDigitalButton');
const downloadPrintButton = document.querySelector('#downloadPrintButton');
const backgroundMode = document.querySelector('#backgroundMode');
const backgroundNote = document.querySelector('#backgroundNote');
const applySuggestionButton = document.querySelector('#applySuggestionButton');
const printPreviewPanel = document.querySelector('#printPreviewPanel');
const printSheetPreview = document.querySelector('#printSheetPreview');

const DIGITAL_PHOTO_SIZE = 600;
const PASSPORT_PHOTO_SIZE = 600;
const PRINT_SHEET_WIDTH = 1800;
const PRINT_SHEET_HEIGHT = 1200;
const PRINT_PREVIEW_WIDTH = 900;
const PRINT_PREVIEW_HEIGHT = 600;
const PRINT_QUOTES = [
  'Great journeys start with a clear first step.',
  'Carry courage. The world is waiting.',
  'Every document begins a new doorway.',
  'Your next chapter deserves a clear picture.',
  'Prepared today, ready tomorrow.',
  'Small steps can open wide horizons.'
];

let currentImageFile = null;
let currentPhotoDataUrl = '';
let backgroundResultDataUrl = '';
let selectedBackgroundMode = 'keep-original';
let analysisRequestId = 0;
let backgroundRequestId = 0;
let currentAiFindings = {
  hasHeadIssue: false,
  recommendedZoom: 100,
  recommendedRotation: 0
};
let currentPrintQuote = PRINT_QUOTES[0];
let previewPanX = 0;
let previewPanY = 0;
let dragState = null;
let localImageFindings = {
  isHuman: true,
  warning: ''
};

const requirementCopy = {
  us: {
    passport: 'US passport photo: 2 x 2 inches, plain white background, centered face.',
    visa: 'US visa photo: 2 x 2 inches, neutral expression, plain light background.',
    id: 'US ID photo: square crop, clear face, even lighting, simple background.',
    baby: 'US baby passport photo: 2 x 2 inches, eyes visible, no parent hands in frame.'
  },
  ca: {
    passport: 'Canada passport photo: 50 x 70 mm, neutral expression, plain light background.',
    visa: 'Canada visa photo: 35 x 45 mm, face centered, no shadows.',
    id: 'Canada ID photo: front-facing image with clear facial features.',
    baby: 'Canada baby photo: child alone, visible face, plain background.'
  },
  uk: {
    passport: 'UK passport photo: 35 x 45 mm, plain light background, neutral expression.',
    visa: 'UK visa photo: 35 x 45 mm, clear face, even lighting.',
    id: 'UK ID photo: recent front-facing image with no heavy shadows.',
    baby: 'UK baby passport photo: child alone, face visible, plain background.'
  },
  in: {
    passport: 'India passport photo: 51 x 51 mm, white background, full face visible.',
    visa: 'India visa photo: 51 x 51 mm, centered head, plain background.',
    id: 'India ID photo: square crop, even lighting, face centered.',
    baby: 'India baby passport photo: clear face, plain white background.'
  }
};

const setChecklist = (state) => {
  const items = Array.from(checklist.querySelectorAll('.check-item'));
  items.forEach((item, index) => {
    item.classList.remove('is-pending', 'is-pass', 'is-warning', 'is-danger');
    if (state === 'ready') {
      item.classList.add('is-pending');
      return;
    }
    if (index === items.length - 1) {
      item.classList.add('is-warning');
      return;
    }
    item.classList.add('is-pass');
  });
};

const setChecklistItem = (name, state, message) => {
  const item = checklist.querySelector(`[data-check="${name}"]`);
  if (!item) {
    return;
  }

  item.classList.remove('is-pending', 'is-pass', 'is-warning', 'is-danger');
  item.classList.add(`is-${state}`);
  item.lastChild.textContent = message;
};

const setAiCheck = (name, state, message) => {
  const item = aiAssessment.querySelector(`[data-ai-check="${name}"]`);
  const messageNode = item.querySelector('span');

  item.classList.remove('is-pending', 'is-pass', 'is-warning');
  item.classList.add(`is-${state}`);
  messageNode.textContent = message;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => resolve(reader.result));
  reader.addEventListener('error', reject);
  reader.readAsDataURL(file);
});

const selectRandomQuote = () => {
  const nextQuote = PRINT_QUOTES[Math.floor(Math.random() * PRINT_QUOTES.length)];
  currentPrintQuote = nextQuote;
  window.__snapPassQuote = currentPrintQuote;
};

const isSkinTone = (red, green, blue) => (
  red > 95 &&
  green > 45 &&
  blue > 30 &&
  red > green * 1.05 &&
  red > blue * 1.18 &&
  green > blue * 0.85 &&
  Math.max(red, green, blue) - Math.min(red, green, blue) > 18
);

const analyzePortraitPixels = () => {
  if (!photoPreview.naturalWidth || !photoPreview.naturalHeight) {
    return { isHuman: true, warning: '' };
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 96;
  canvas.height = 96;
  context.drawImage(photoPreview, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let centralSkinPixels = 0;
  let centralPixels = 0;

  for (let y = 12; y < 62; y += 1) {
    for (let x = 24; x < 72; x += 1) {
      const index = (y * canvas.width + x) * 4;
      centralPixels += 1;
      if (isSkinTone(imageData[index], imageData[index + 1], imageData[index + 2])) {
        centralSkinPixels += 1;
      }
    }
  }

  const centralSkinRatio = centralSkinPixels / centralPixels;
  if (centralSkinRatio < 0.08) {
    return {
      isHuman: false,
      warning: 'No clear human face area detected. Upload a front-facing portrait of one person.'
    };
  }

  return { isHuman: true, warning: '' };
};

const mergeLocalImageFindings = (analysis) => {
  if (localImageFindings.isHuman) {
    return analysis;
  }

  return {
    ...analysis,
    isHuman: false,
    warnings: [localImageFindings.warning, ...(analysis.warnings || [])],
    checks: {
      ...(analysis.checks || {}),
      human: localImageFindings.warning
    }
  };
};

const runAiAssessment = (file) => {
  const name = file.name.toLowerCase();
  const isLikelyNotHuman = /object|pet|car|vehicle|logo|document|landscape|room|food/.test(name) || !localImageFindings.isHuman;
  const hasLightingIssue = /dark|shadow|glare|dim|bright/.test(name);
  const hasHeadIssue = /offcenter|off-center|side|tilt|far/.test(name);
  const hasBackgroundIssue = /busy|background|object|room|pattern/.test(name);

  currentAiFindings = {
    hasHeadIssue,
    recommendedZoom: 100,
    recommendedRotation: 0
  };
  applySuggestionButton.hidden = false;
  humanWarning.hidden = !isLikelyNotHuman;
  aiStatus.textContent = isLikelyNotHuman ? 'Retake needed' : 'AI preview';
  aiStatus.classList.toggle('is-warning', isLikelyNotHuman || hasLightingIssue || hasHeadIssue || hasBackgroundIssue);

  setAiCheck(
    'human',
    isLikelyNotHuman ? 'warning' : 'pass',
    isLikelyNotHuman
      ? (localImageFindings.warning || 'No clear human portrait detected in this prototype state.')
      : 'Looks like a single front-facing portrait.'
  );
  setAiCheck(
    'lighting',
    hasLightingIssue ? 'warning' : 'pass',
    hasLightingIssue
      ? 'Lighting may be uneven. Retake in soft front light with no shadows.'
      : 'Lighting appears even enough for preview.'
  );
  setAiCheck(
    'head',
    hasHeadIssue ? 'warning' : 'pass',
    hasHeadIssue
      ? 'Head may be tilted or off center. Use zoom/rotate or retake straight-on.'
      : 'Head appears centered inside the guide.'
  );
  setAiCheck(
    'background',
    hasBackgroundIssue ? 'warning' : 'pass',
    hasBackgroundIssue
      ? 'Background may contain objects or texture. Use a plain white/off-white wall.'
      : 'Background appears plain for preview.'
  );
};

const applyAiFindings = (analysis) => {
  const warnings = Array.isArray(analysis.warnings) ? analysis.warnings : [];
  const hasHumanWarning = analysis.isHuman === false;
  const hasLightingIssue = analysis.lighting === 'warning';
  const hasHeadIssue = analysis.headCentered === 'warning';
  const hasBackgroundIssue = analysis.background === 'warning';

  currentAiFindings = {
    hasHeadIssue,
    recommendedZoom: Number(analysis.recommendedZoom || 100),
    recommendedRotation: Number(analysis.recommendedRotation || 0)
  };

  humanWarning.hidden = !hasHumanWarning;
  humanWarning.textContent = warnings[0] || 'Warning: upload a front-facing photo of one person.';
  aiStatus.textContent = hasHumanWarning ? 'Retake needed' : 'AI preview';
  aiStatus.classList.toggle('is-warning', hasHumanWarning || hasLightingIssue || hasHeadIssue || hasBackgroundIssue);
  applySuggestionButton.hidden = false;

  setAiCheck(
    'human',
    hasHumanWarning ? 'warning' : 'pass',
    analysis.checks?.human || (hasHumanWarning
      ? 'No clear human passport-style portrait detected.'
      : 'Looks like a single front-facing portrait.')
  );
  setAiCheck(
    'lighting',
    hasLightingIssue ? 'warning' : 'pass',
    analysis.checks?.lighting || (hasLightingIssue
      ? 'Lighting may be uneven. Retake in soft front light.'
      : 'Lighting appears even enough for preview.')
  );
  setAiCheck(
    'head',
    hasHeadIssue ? 'warning' : 'pass',
    analysis.checks?.head || (hasHeadIssue
      ? 'Head may be outside the recommended passport guide.'
      : 'Head appears centered inside the guide.')
  );
  setAiCheck(
    'background',
    hasBackgroundIssue ? 'warning' : 'pass',
    analysis.checks?.background || (hasBackgroundIssue
      ? 'Background may need white replacement or cleanup.'
      : 'Background appears plain for preview.')
  );

  evaluateCropFit();
};

const requestPhotoAnalysis = async (file) => {
  if (!currentPhotoDataUrl) {
    return;
  }

  const requestId = ++analysisRequestId;
  aiStatus.textContent = 'Analyzing photo...';
  aiStatus.classList.remove('is-warning');

  try {
    const response = await fetch('/api/photo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: currentPhotoDataUrl,
        filename: file.name,
        country: country.value,
        documentType: documentType.value
      })
    });
    const analysis = mergeLocalImageFindings(await response.json());
    if (requestId !== analysisRequestId || !currentImageFile) {
      return;
    }
    applyAiFindings(analysis);
  } catch {
    if (requestId !== analysisRequestId || !currentImageFile) {
      return;
    }
    runAiAssessment(file);
  }
};

const resetAiAssessment = () => {
  aiStatus.textContent = 'Waiting for photo';
  aiStatus.classList.remove('is-warning');
  humanWarning.hidden = true;
  applySuggestionButton.hidden = true;
  setAiCheck('human', 'pending', 'Upload a face photo to check.');
  setAiCheck('lighting', 'pending', 'Checks for underexposure, glare, and hard shadows.');
  setAiCheck('head', 'pending', 'Checks whether the face sits inside the passport guide.');
  setAiCheck('background', 'pending', 'Checks for a plain white or off-white background.');
};

const updateRequirementSummary = () => {
  const copy = requirementCopy[country.value][documentType.value];
  requirementSummary.textContent = copy;
};

const updatePreviewTransform = () => {
  const zoom = Number(zoomRange.value);
  const rotate = Number(rotateRange.value);
  zoomValue.textContent = `${zoom}%`;
  rotateValue.textContent = `${rotate}°`;
  photoFrame.style.setProperty('--preview-zoom', String(zoom / 100));
  photoFrame.style.setProperty('--preview-rotate', `${rotate}deg`);
  photoFrame.style.setProperty('--preview-pan-x', `${previewPanX}%`);
  photoFrame.style.setProperty('--preview-pan-y', `${previewPanY}%`);
  evaluateCropFit();
  renderPrintSheetPreview();
};

const requestBackgroundEdit = async () => {
  if (!currentImageFile || !currentPhotoDataUrl || selectedBackgroundMode === 'keep-original') {
    return;
  }

  const requestId = ++backgroundRequestId;
  backgroundNote.textContent = selectedBackgroundMode === 'ai-cleanup'
    ? 'Cleaning background while preserving facial features...'
    : 'Replacing background with white...';

  try {
    const response = await fetch('/api/photo/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: currentPhotoDataUrl,
        mode: selectedBackgroundMode
      })
    });
    const result = await response.json();
    if (requestId !== backgroundRequestId || !currentImageFile || backgroundMode.value !== selectedBackgroundMode) {
      return;
    }

    backgroundResultDataUrl = result.imageDataUrl || '';
    if (backgroundResultDataUrl) {
      photoPreview.src = backgroundResultDataUrl;
      photoFrame.classList.remove('subject-mask');
      backgroundNote.textContent = result.message || 'AI background cleanup applied.';
      return;
    }

    photoFrame.classList.remove('subject-mask');
    backgroundNote.textContent = result.message || 'AI cleanup needs a server API key. Preview keeps the photo intact instead of masking over the subject.';
  } catch {
    if (requestId !== backgroundRequestId || !currentImageFile) {
      return;
    }
    backgroundResultDataUrl = '';
    photoFrame.classList.remove('subject-mask');
    backgroundNote.textContent = 'AI cleanup is unavailable. Preview keeps the photo intact instead of masking over the subject.';
  }
};

const applyBackgroundMode = () => {
  selectedBackgroundMode = backgroundMode.value;
  backgroundRequestId += 1;
  backgroundResultDataUrl = '';
  if (currentPhotoDataUrl) {
    photoPreview.src = currentPhotoDataUrl;
  }
  photoFrame.classList.toggle('background-white', selectedBackgroundMode === 'replace-white');
  photoFrame.classList.toggle('background-soft-white', selectedBackgroundMode === 'ai-cleanup');
  photoFrame.classList.remove('subject-mask');
  renderPrintSheetPreview();

  const backgroundMessages = {
    'keep-original': 'Use a plain white or off-white background for most passport photos.',
    'replace-white': 'AI will replace only the background with white when the server API key is configured.',
    'ai-cleanup': 'AI cleanup removes background objects and advises photo fixes without changing facial features.'
  };

  backgroundNote.textContent = backgroundMessages[selectedBackgroundMode];

  if (!currentImageFile) {
    return;
  }

  if (selectedBackgroundMode === 'keep-original') {
    setChecklistItem('background', 'warning', 'Background needs review');
    setAiCheck('background', 'warning', 'Original background is kept. Confirm it is plain white or off-white.');
    return;
  }

  setChecklistItem('background', 'pass', 'Background: plain white');
  setAiCheck('background', 'pass', selectedBackgroundMode === 'ai-cleanup'
    ? 'AI cleanup preview removes background clutter while preserving facial features.'
    : 'Background will export as white.');
  requestBackgroundEdit();
};

const evaluateCropFit = () => {
  if (!currentImageFile) {
    return;
  }

  const zoom = Number(zoomRange.value);
  const rotate = Math.abs(Number(rotateRange.value));
  const pan = Math.max(Math.abs(previewPanX), Math.abs(previewPanY));
  const isDanger = zoom < 88 || zoom > 132 || rotate > 6 || pan > 18;
  const isWarning = !isDanger && (zoom < 94 || zoom > 120 || rotate > 3 || pan > 10);

  statusPill.classList.toggle('is-danger', isDanger);
  statusPill.classList.toggle('is-warning', isWarning && !isDanger);

  if (isDanger) {
    statusPill.textContent = 'Fix crop';
    setChecklistItem('head', 'danger', 'Headshot out of range');
    setAiCheck('head', 'warning', 'Head size, rotation, or position is outside the passport guide. Drag, zoom, or rotate before export.');
    return;
  }

  if (isWarning) {
    statusPill.textContent = 'Adjust crop';
    setChecklistItem('head', 'warning', 'Headshot needs adjustment');
    setAiCheck('head', 'warning', 'Head is close, but position, zoom, or rotation may need a small adjustment.');
    return;
  }

  if (currentAiFindings.hasHeadIssue) {
    statusPill.textContent = 'Adjust crop';
    statusPill.classList.add('is-warning');
    setChecklistItem('head', 'warning', 'Headshot needs adjustment');
    setAiCheck('head', 'warning', 'Head may be tilted or off center. Use zoom/rotate or retake straight-on.');
    return;
  }

  statusPill.textContent = 'Preview ready';
  setChecklistItem('head', 'pass', 'Head centered');
  setAiCheck('head', 'pass', 'Head appears centered inside the guide.');
};

const showLoadedState = async (file) => {
  currentImageFile = file;
  currentPhotoDataUrl = '';
  backgroundResultDataUrl = '';
  selectRandomQuote();
  photoPreview.src = URL.createObjectURL(file);
  photoPreview.alt = `Preview of ${file.name}`;
  photoFrame.classList.add('has-photo');
  adjustmentPanel.hidden = false;
  exportPanel.hidden = false;
  printPreviewPanel.hidden = false;
  statusPill.textContent = 'Review lighting';
  statusPill.classList.add('is-warning');
  statusPill.classList.remove('is-danger');
  setChecklist('loaded');
  runAiAssessment(file);
  applyBackgroundMode();
  updatePreviewTransform();

  try {
    currentPhotoDataUrl = await readFileAsDataUrl(file);
    if (currentImageFile !== file) {
      return;
    }
    photoPreview.src = currentPhotoDataUrl;
    await photoPreview.decode();
    localImageFindings = analyzePortraitPixels();
    applyBackgroundMode();
    runAiAssessment(file);
    await requestPhotoAnalysis(file);
  } catch {
    runAiAssessment(file);
  }
};

const resetState = () => {
  currentImageFile = null;
  currentPhotoDataUrl = '';
  backgroundResultDataUrl = '';
  selectedBackgroundMode = 'keep-original';
  analysisRequestId += 1;
  backgroundRequestId += 1;
  currentAiFindings = {
    hasHeadIssue: false,
    recommendedZoom: 100,
    recommendedRotation: 0
  };
  currentPrintQuote = PRINT_QUOTES[0];
  window.__snapPassQuote = currentPrintQuote;
  previewPanX = 0;
  previewPanY = 0;
  dragState = null;
  localImageFindings = {
    isHuman: true,
    warning: ''
  };
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  photoPreview.alt = '';
  photoFrame.classList.remove('has-photo');
  photoFrame.classList.remove('background-white', 'background-soft-white', 'subject-mask', 'is-dragging');
  adjustmentPanel.hidden = true;
  exportPanel.hidden = true;
  printPreviewPanel.hidden = true;
  zoomRange.value = '100';
  rotateRange.value = '0';
  backgroundMode.value = 'keep-original';
  applyBackgroundMode();
  statusPill.textContent = 'Ready';
  statusPill.classList.remove('is-warning', 'is-danger');
  setChecklist('ready');
  resetAiAssessment();
  updatePreviewTransform();
  clearPrintSheetPreview();
};

const fillCanvasBackground = (context, canvas) => {
  context.fillStyle = selectedBackgroundMode === 'ai-cleanup' ? '#fbfaf4' : '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
};

const drawPhotoToCanvas = (canvas, options = {}) => {
  const context = canvas.getContext('2d');
  const zoom = Number(zoomRange.value) / 100;
  const rotate = Number(rotateRange.value) * Math.PI / 180;
  const size = options.size || canvas.width;

  fillCanvasBackground(context, canvas);

  context.save();
  context.translate(
    canvas.width / 2 + (canvas.width * previewPanX / 100),
    canvas.height / 2 + (canvas.height * previewPanY / 100)
  );
  context.rotate(rotate);
  context.scale(zoom, zoom);

  const drawSubject = () => drawImageCover(context, photoPreview, -size / 2, -size / 2, size, size);

  drawSubject();
  context.restore();
};

const drawImageCover = (context, image, x, y, width, height) => {
  const sourceWidth = image.naturalWidth || image.videoWidth || width;
  const sourceHeight = image.naturalHeight || image.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
};

const getPrintSheetPositions = (scale = 1) => {
  const size = PASSPORT_PHOTO_SIZE * scale;
  return [
    [0, 0, size],
    [size, 0, size],
    [0, size, size],
    [size, size, size]
  ];
};

const drawPrintQuote = (context, scale = 1) => {
  const quoteX = PASSPORT_PHOTO_SIZE * 2 * scale;
  const quoteWidth = PASSPORT_PHOTO_SIZE * scale;
  const quoteCenterX = quoteX + quoteWidth / 2;
  const quoteCenterY = PRINT_SHEET_HEIGHT * scale / 2;

  context.save();
  context.fillStyle = '#f8fffb';
  context.fillRect(quoteX, 0, quoteWidth, PRINT_SHEET_HEIGHT * scale);
  context.strokeStyle = '#d5e4dd';
  context.lineWidth = Math.max(1, 2 * scale);
  context.strokeRect(quoteX + 0.5, 0.5, quoteWidth - 1, PRINT_SHEET_HEIGHT * scale - 1);
  context.fillStyle = '#10251f';
  context.textAlign = 'center';
  context.font = `${Math.max(16, 44 * scale)}px system-ui, sans-serif`;
  context.fillText('"' + currentPrintQuote + '"', quoteCenterX, quoteCenterY - 16 * scale, quoteWidth * 0.82);
  context.fillStyle = '#167f63';
  context.font = `${Math.max(11, 22 * scale)}px system-ui, sans-serif`;
  context.fillText('SnapPass.me', quoteCenterX, quoteCenterY + 38 * scale, quoteWidth * 0.82);
  context.restore();
};

const drawPrintSheet = (canvas, scale = 1) => {
  const context = canvas.getContext('2d');
  const photoCanvas = document.createElement('canvas');
  const scaledPhotoSize = PASSPORT_PHOTO_SIZE * scale;
  photoCanvas.width = scaledPhotoSize;
  photoCanvas.height = scaledPhotoSize;
  drawPhotoToCanvas(photoCanvas, { size: scaledPhotoSize });

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  getPrintSheetPositions(scale).forEach(([x, y, size]) => {
    context.drawImage(photoCanvas, x, y, size, size);
    context.strokeStyle = '#d5e4dd';
    context.lineWidth = Math.max(1, 2 * scale);
    context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  });

  drawPrintQuote(context, scale);
};

const clearPrintSheetPreview = () => {
  const context = printSheetPreview.getContext('2d');
  context.clearRect(0, 0, printSheetPreview.width, printSheetPreview.height);
};

const renderPrintSheetPreview = () => {
  if (!currentImageFile || !printSheetPreview || !photoPreview.complete || !photoPreview.naturalWidth) {
    return;
  }

  printSheetPreview.width = PRINT_PREVIEW_WIDTH;
  printSheetPreview.height = PRINT_PREVIEW_HEIGHT;
  drawPrintSheet(printSheetPreview, PRINT_PREVIEW_WIDTH / PRINT_SHEET_WIDTH);
};

const downloadCanvas = (canvas, filename) => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const downloadDigitalPhoto = () => {
  if (!currentImageFile) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = DIGITAL_PHOTO_SIZE;
  canvas.height = DIGITAL_PHOTO_SIZE;
  drawPhotoToCanvas(canvas, { size: DIGITAL_PHOTO_SIZE });
  downloadCanvas(canvas, 'snappass-digital-photo.png');
};

const downloadPrintableSheet = () => {
  if (!currentImageFile) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = PRINT_SHEET_WIDTH;
  canvas.height = PRINT_SHEET_HEIGHT;
  drawPrintSheet(canvas);

  downloadCanvas(canvas, 'snappass-printable-4x6.png');
};

country.addEventListener('change', updateRequirementSummary);
documentType.addEventListener('change', updateRequirementSummary);

photoInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    resetState();
    statusPill.textContent = 'Unsupported file';
    statusPill.classList.add('is-warning');
    return;
  }

  showLoadedState(file);
});

zoomRange.addEventListener('input', updatePreviewTransform);
rotateRange.addEventListener('input', updatePreviewTransform);
backgroundMode.addEventListener('change', applyBackgroundMode);

photoStage.addEventListener('click', () => {
  if (!currentImageFile) {
    photoInput.click();
  }
});

photoStage.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    photoInput.click();
  }
});

applySuggestionButton.addEventListener('click', () => {
  zoomRange.value = String(Math.min(140, Math.max(80, currentAiFindings.recommendedZoom || 100)));
  rotateRange.value = String(Math.min(8, Math.max(-8, currentAiFindings.recommendedRotation || 0)));
  previewPanX = 0;
  previewPanY = 0;
  updatePreviewTransform();
});

photoFrame.addEventListener('pointerdown', (event) => {
  if (!currentImageFile) {
    return;
  }

  event.preventDefault();
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    panX: previewPanX,
    panY: previewPanY
  };
  photoFrame.classList.add('is-dragging');
  photoFrame.setPointerCapture(event.pointerId);
});

photoFrame.addEventListener('pointermove', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const bounds = photoFrame.getBoundingClientRect();
  const nextPanX = dragState.panX + ((event.clientX - dragState.startX) / bounds.width) * 100;
  const nextPanY = dragState.panY + ((event.clientY - dragState.startY) / bounds.height) * 100;
  previewPanX = Math.min(24, Math.max(-24, nextPanX));
  previewPanY = Math.min(24, Math.max(-24, nextPanY));
  updatePreviewTransform();
});

const stopPreviewDrag = (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  dragState = null;
  photoFrame.classList.remove('is-dragging');
  if (photoFrame.hasPointerCapture(event.pointerId)) {
    photoFrame.releasePointerCapture(event.pointerId);
  }
};

photoFrame.addEventListener('pointerup', stopPreviewDrag);
photoFrame.addEventListener('pointercancel', stopPreviewDrag);

resetButton.addEventListener('click', resetState);
downloadDigitalButton.addEventListener('click', downloadDigitalPhoto);
downloadPrintButton.addEventListener('click', downloadPrintableSheet);

cameraButton.addEventListener('click', () => {
  photoInput.click();
});

updateRequirementSummary();
resetState();
