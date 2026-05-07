const country = document.querySelector('#country');
const documentType = document.querySelector('#documentType');
const requirementSummary = document.querySelector('#requirementSummary');
const photoInput = document.querySelector('#photoInput');
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

const runAiAssessment = (file) => {
  const name = file.name.toLowerCase();
  const isLikelyNotHuman = /object|pet|car|logo|document|landscape|room|food/.test(name);
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
      ? 'No clear human portrait detected in this prototype state.'
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
    const analysis = await response.json();
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
  evaluateCropFit();
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

    photoFrame.classList.add('subject-mask');
    backgroundNote.textContent = result.message || 'Using server fallback mask.';
  } catch {
    if (requestId !== backgroundRequestId || !currentImageFile) {
      return;
    }
    backgroundResultDataUrl = '';
    photoFrame.classList.add('subject-mask');
    backgroundNote.textContent = 'Using server fallback mask because AI cleanup is unavailable.';
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
  photoFrame.classList.toggle('subject-mask', selectedBackgroundMode !== 'keep-original');

  const backgroundMessages = {
    'keep-original': 'Use a plain white or off-white background for most passport photos.',
    'replace-white': 'Preview replaces the backdrop with white while preserving the face area.',
    'ai-cleanup': 'AI cleanup preview would remove background objects without changing facial features.'
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
  const isDanger = zoom < 88 || zoom > 132 || rotate > 6;
  const isWarning = !isDanger && (zoom < 94 || zoom > 120 || rotate > 3);

  statusPill.classList.toggle('is-danger', isDanger);
  statusPill.classList.toggle('is-warning', isWarning && !isDanger);

  if (isDanger) {
    statusPill.textContent = 'Fix crop';
    setChecklistItem('head', 'danger', 'Headshot out of range');
    setAiCheck('head', 'warning', 'Head size or rotation is outside the passport guide. Adjust zoom/rotate before export.');
    return;
  }

  if (isWarning) {
    statusPill.textContent = 'Adjust crop';
    setChecklistItem('head', 'warning', 'Headshot needs adjustment');
    setAiCheck('head', 'warning', 'Head is close, but zoom or rotation may need a small adjustment.');
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
  photoPreview.src = URL.createObjectURL(file);
  photoPreview.alt = `Preview of ${file.name}`;
  photoFrame.classList.add('has-photo');
  adjustmentPanel.hidden = false;
  exportPanel.hidden = false;
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
    applyBackgroundMode();
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
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  photoPreview.alt = '';
  photoFrame.classList.remove('has-photo');
  photoFrame.classList.remove('background-white', 'background-soft-white', 'subject-mask');
  adjustmentPanel.hidden = true;
  exportPanel.hidden = true;
  zoomRange.value = '100';
  rotateRange.value = '0';
  backgroundMode.value = 'keep-original';
  applyBackgroundMode();
  statusPill.textContent = 'Ready';
  statusPill.classList.remove('is-warning', 'is-danger');
  setChecklist('ready');
  resetAiAssessment();
  updatePreviewTransform();
};

const fillCanvasBackground = (context, canvas) => {
  context.fillStyle = selectedBackgroundMode === 'ai-cleanup' ? '#fbfaf4' : '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
};

const drawMaskedSubject = (context, canvas, drawSubject) => {
  context.save();
  context.beginPath();
  context.ellipse(
    canvas.width / 2,
    canvas.height * 0.48,
    canvas.width * 0.34,
    canvas.height * 0.45,
    0,
    0,
    Math.PI * 2
  );
  context.clip();
  drawSubject();
  context.restore();
};

const drawPhotoToCanvas = (canvas, options = {}) => {
  const context = canvas.getContext('2d');
  const zoom = Number(zoomRange.value) / 100;
  const rotate = Number(rotateRange.value) * Math.PI / 180;
  const size = options.size || canvas.width;

  fillCanvasBackground(context, canvas);

  context.save();
  const shouldMaskSubject = selectedBackgroundMode !== 'keep-original' && !backgroundResultDataUrl;
  if (shouldMaskSubject) {
    context.beginPath();
    context.ellipse(
      canvas.width / 2,
      canvas.height * 0.48,
      canvas.width * 0.34,
      canvas.height * 0.45,
      0,
      0,
      Math.PI * 2
    );
    context.clip();
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotate);
  context.scale(zoom, zoom);

  const drawSubject = () => {
    context.drawImage(photoPreview, -size / 2, -size / 2, size, size);
  };

  drawSubject();
  context.restore();
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
  canvas.width = 600;
  canvas.height = 600;
  drawPhotoToCanvas(canvas, { size: 600 });
  downloadCanvas(canvas, 'snappass-digital-photo.png');
};

const downloadPrintableSheet = () => {
  if (!currentImageFile) {
    return;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1800;
  canvas.height = 1200;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = 600;
  photoCanvas.height = 600;
  drawPhotoToCanvas(photoCanvas, { size: 600 });

  const positions = [
    [160, 160],
    [820, 160],
    [160, 820],
    [820, 820]
  ];

  positions.forEach(([x, y]) => {
    context.drawImage(photoCanvas, x, y, 300, 300);
    context.strokeStyle = '#d5e4dd';
    context.strokeRect(x, y, 300, 300);
  });

  context.fillStyle = '#10251f';
  context.font = '32px system-ui, sans-serif';
  context.fillText('SnapPass.me printable 4x6 sheet', 1160, 220);
  context.font = '22px system-ui, sans-serif';
  context.fillText('Prototype output: verify final photo', 1160, 262);
  context.fillText('against official requirements.', 1160, 292);

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

applySuggestionButton.addEventListener('click', () => {
  zoomRange.value = String(Math.min(140, Math.max(80, currentAiFindings.recommendedZoom || 100)));
  rotateRange.value = String(Math.min(8, Math.max(-8, currentAiFindings.recommendedRotation || 0)));
  updatePreviewTransform();
});

resetButton.addEventListener('click', resetState);
downloadDigitalButton.addEventListener('click', downloadDigitalPhoto);
downloadPrintButton.addEventListener('click', downloadPrintableSheet);

cameraButton.addEventListener('click', () => {
  photoInput.click();
});

updateRequirementSummary();
resetState();
