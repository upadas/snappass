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
const advisorSummary = document.querySelector('#advisorSummary');
const downloadDigitalButton = document.querySelector('#downloadDigitalButton');
const downloadPrintButton = document.querySelector('#downloadPrintButton');
const printOrderForm = document.querySelector('#printOrderForm');
const printZip = document.querySelector('#printZip');
const printContact = document.querySelector('#printContact');
const printOrderButton = document.querySelector('#printOrderButton');
const printOrderStatus = document.querySelector('#printOrderStatus');
const backgroundMode = document.querySelector('#backgroundMode');
const backgroundNote = document.querySelector('#backgroundNote');
const lightingMode = document.querySelector('#lightingMode');
const applySuggestionButton = document.querySelector('#applySuggestionButton');
const printPreviewPanel = document.querySelector('#printPreviewPanel');
const printPreviewLabel = document.querySelector('#printPreviewLabel');
const printSheetPreview = document.querySelector('#printSheetPreview');
const specPills = Array.from(document.querySelectorAll('[data-spec-pill]'));
const variantPanel = document.querySelector('#variantPanel');
const variantCards = Array.from(document.querySelectorAll('.variant-card'));
const variantOriginalPreview = document.querySelector('#variantOriginalPreview');
const variantAiPreview = document.querySelector('#variantAiPreview');
const variantWhitePreview = document.querySelector('#variantWhitePreview');
const variantLightingPreview = document.querySelector('#variantLightingPreview');
const phoneUploadButton = document.querySelector('#phoneUploadButton');
const phoneUploadModal = document.querySelector('#phoneUploadModal');
const phoneUploadClose = document.querySelector('#phoneUploadClose');
const phoneUploadQr = document.querySelector('#phoneUploadQr');
const phoneUploadLink = document.querySelector('#phoneUploadLink');
const phoneUploadStatus = document.querySelector('#phoneUploadStatus');
const cameraModal = document.querySelector('#cameraModal');
const cameraClose = document.querySelector('#cameraClose');
const cameraVideo = document.querySelector('#cameraVideo');
const cameraStatus = document.querySelector('#cameraStatus');
const cancelCameraButton = document.querySelector('#cancelCameraButton');
const flipCameraButton = document.querySelector('#flipCameraButton');
const captureCameraButton = document.querySelector('#captureCameraButton');

const DEFAULT_OUTPUT_SIZE = 600;
const MIN_ZOOM = 80;
const MAX_ZOOM = 250;
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
let processedPhotoDataUrl = '';
let selectedVariant = 'original';
let photoVariants = {
  original: '',
  ai: '',
  white: '',
  lighting: ''
};
let selectedBackgroundMode = 'keep-original';
let analysisRequestId = 0;
let backgroundRequestId = 0;
let processingRequestId = 0;
let suggestionRequestId = 0;
let currentAiFindings = {
  hasHumanWarning: false,
  hasHeadIssue: false,
  hasEyeClarityIssue: false,
  retakeRequired: false,
  recommendedZoom: 100,
  recommendedRotation: 0
};
let currentPrintQuote = PRINT_QUOTES[0];
let previewPanX = 0;
let previewPanY = 0;
let dragState = null;
let phoneUploadSession = '';
let phoneUploadPollTimer = null;
let cameraStream = null;
let cameraFacingMode = 'environment';
let adjustedPreviewTimer = null;
let adjustedPreviewRefreshId = 0;
let localImageFindings = {
  isHuman: true,
  warning: '',
  backgroundPlain: true,
  lightingEven: true,
  eyesClear: true,
  retakeRequired: false
};

const documentSpecs = {
  us: {
    passport: {
      summary: 'US passport photo: 2 x 2 inches, 600 x 600 px minimum, head 50-69%, eyes 56-69% from bottom.',
      size: '2 x 2 in',
      pixels: '600 x 600 px+',
      head: 'Head 50-69%',
      eyes: 'Eyes 56-69%',
      checklistSize: '2 x 2 / 600 px',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 2 x 2 in each'
    },
    visa: {
      summary: 'US visa photo: 2 x 2 inches, 600 x 600 px minimum, neutral expression, plain light background.',
      size: '2 x 2 in',
      pixels: '600 x 600 px+',
      head: 'Head 50-69%',
      eyes: 'Eyes 56-69%',
      checklistSize: '2 x 2 / 600 px',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 2 x 2 in each'
    },
    id: {
      summary: 'US ID photo: square crop, clear face, even lighting, simple background.',
      size: 'Square crop',
      pixels: '600 x 600 px+',
      head: 'Face centered',
      eyes: 'Eyes visible',
      checklistSize: 'Square / 600 px',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 square ID photos'
    },
    baby: {
      summary: 'US baby passport photo: 2 x 2 inches, eyes visible, no parent hands in frame.',
      size: '2 x 2 in',
      pixels: '600 x 600 px+',
      head: 'Head 50-69%',
      eyes: 'Eyes visible',
      checklistSize: '2 x 2 / 600 px',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 2 x 2 in each'
    }
  },
  ca: {
    passport: {
      summary: 'Canada passport photo: 50 x 70 mm, neutral expression, plain white or light background.',
      size: '50 x 70 mm',
      pixels: '600 x 840 px+',
      head: 'Face 31-36 mm',
      eyes: 'Eyes visible',
      checklistSize: '50 x 70 mm',
      outputWidth: 600,
      outputHeight: 840,
      printLabel: 'Canada 50 x 70 mm photos'
    },
    visa: {
      summary: 'Canada visa photo: 35 x 45 mm, face centered, no shadows.',
      size: '35 x 45 mm',
      pixels: '420 x 540 px+',
      head: 'Face centered',
      eyes: 'Eyes visible',
      checklistSize: '35 x 45 mm',
      outputWidth: 420,
      outputHeight: 540,
      printLabel: 'Canada 35 x 45 mm photos'
    },
    id: {
      summary: 'Canada ID photo: front-facing image with clear facial features.',
      size: 'ID target',
      pixels: '600 px+',
      head: 'Face centered',
      eyes: 'Eyes visible',
      checklistSize: 'ID spec',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: 'Canada ID photos'
    },
    baby: {
      summary: 'Canada baby photo: child alone, visible face, plain background.',
      size: '50 x 70 mm',
      pixels: '600 x 840 px+',
      head: 'Face visible',
      eyes: 'Eyes visible',
      checklistSize: '50 x 70 mm',
      outputWidth: 600,
      outputHeight: 840,
      printLabel: 'Canada baby photos'
    }
  },
  uk: {
    passport: {
      summary: 'UK passport photo: 35 x 45 mm, at least 600 x 750 px for digital, plain light background, neutral expression.',
      size: '35 x 45 mm',
      pixels: '600 x 750 px+',
      head: 'Head 29-34 mm',
      eyes: 'Eyes visible',
      checklistSize: '35 x 45 mm',
      outputWidth: 600,
      outputHeight: 750,
      printLabel: 'UK 35 x 45 mm photos'
    },
    visa: {
      summary: 'UK visa photo: 35 x 45 mm, clear face, even lighting.',
      size: '35 x 45 mm',
      pixels: '600 x 750 px+',
      head: 'Head 29-34 mm',
      eyes: 'Eyes visible',
      checklistSize: '35 x 45 mm',
      outputWidth: 600,
      outputHeight: 750,
      printLabel: 'UK 35 x 45 mm photos'
    },
    id: {
      summary: 'UK ID photo: recent front-facing image with no heavy shadows.',
      size: '35 x 45 mm',
      pixels: '600 x 750 px+',
      head: 'Face centered',
      eyes: 'Eyes visible',
      checklistSize: '35 x 45 mm',
      outputWidth: 600,
      outputHeight: 750,
      printLabel: 'UK ID photos'
    },
    baby: {
      summary: 'UK baby passport photo: child alone, face visible, plain background.',
      size: '35 x 45 mm',
      pixels: '600 x 750 px+',
      head: 'Face visible',
      eyes: 'Eyes visible',
      checklistSize: '35 x 45 mm',
      outputWidth: 600,
      outputHeight: 750,
      printLabel: 'UK baby photos'
    }
  },
  in: {
    passport: {
      summary: 'India passport photo: 51 x 51 mm, 600 x 600 px minimum, white background, full face visible.',
      size: '51 x 51 mm',
      pixels: '600 x 600 px+',
      head: 'Full face visible',
      eyes: 'Eyes visible',
      checklistSize: '51 x 51 mm',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 51 x 51 mm each'
    },
    visa: {
      summary: 'India visa photo: 51 x 51 mm, centered head, plain white background.',
      size: '51 x 51 mm',
      pixels: '600 x 600 px+',
      head: 'Head centered',
      eyes: 'Eyes visible',
      checklistSize: '51 x 51 mm',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 51 x 51 mm each'
    },
    id: {
      summary: 'India ID photo: square crop, even lighting, face centered.',
      size: 'Square crop',
      pixels: '600 x 600 px+',
      head: 'Face centered',
      eyes: 'Eyes visible',
      checklistSize: 'Square / 600 px',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: 'India ID photos'
    },
    baby: {
      summary: 'India baby passport photo: 51 x 51 mm, clear face, plain white background.',
      size: '51 x 51 mm',
      pixels: '600 x 600 px+',
      head: 'Face visible',
      eyes: 'Eyes visible',
      checklistSize: '51 x 51 mm',
      outputWidth: 600,
      outputHeight: 600,
      printLabel: '4 photos, 51 x 51 mm each'
    }
  }
};

let activeSpec = documentSpecs.us.passport;

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
  applySpecLabels();
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

const getSelectedSpec = () => {
  const countrySpecs = documentSpecs[country.value] || documentSpecs.us;
  return countrySpecs[documentType.value] || countrySpecs.passport || documentSpecs.us.passport;
};

const applySpecLabels = () => {
  activeSpec = getSelectedSpec();
  requirementSummary.textContent = activeSpec.summary;
  specPills.forEach((pill) => {
    const key = pill.dataset.specPill;
    pill.textContent = activeSpec[key] || '';
  });
  printPreviewLabel.textContent = activeSpec.printLabel;
  setChecklistItem('size', currentImageFile ? 'pass' : 'pending', activeSpec.checklistSize);
  if (!currentImageFile) {
    setChecklistItem('head', 'pending', activeSpec.head);
    setChecklistItem('lighting', 'pending', activeSpec.eyes);
  }
};

const setAiCheck = (name, state, message) => {
  const label = {
    human: 'Human subject',
    lighting: 'Lighting',
    head: 'Head fit',
    background: 'Background'
  }[name] || 'Photo check';
  if (state === 'warning') {
    advisorSummary.textContent = `${label}: ${message}`;
  } else if (!advisorSummary.textContent || /Upload a photo|Analyzing|Preparing/.test(advisorSummary.textContent)) {
    advisorSummary.textContent = message;
  }
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => resolve(reader.result));
  reader.addEventListener('error', reject);
  reader.readAsDataURL(file);
});

const loadPhotoFile = (file) => {
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
};

const dataUrlToFile = async (dataUrl, filename = 'phone-upload.png') => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
};

const setVariant = async (name, dataUrl) => {
  photoVariants[name] = dataUrl || '';
  const preview = {
    original: variantOriginalPreview,
    ai: variantAiPreview,
    white: variantWhitePreview,
    lighting: variantLightingPreview
  }[name];
  const card = variantCards.find((item) => item.dataset.variant === name);
  if (preview) {
    if (dataUrl) {
      preview.src = dataUrl;
    } else {
      preview.removeAttribute('src');
    }
    preview.alt = dataUrl ? `${name} passport photo preview` : '';
  }
  if (card) {
    card.disabled = !dataUrl;
    card.dataset.emptyLabel = 'Not ready';
  }
};

const setVariantError = (name, message, fallbackLabel = 'AI edit failed') => {
  const card = variantCards.find((item) => item.dataset.variant === name);
  const preview = {
    ai: variantAiPreview,
    white: variantWhitePreview,
    lighting: variantLightingPreview
  }[name];
  if (preview) {
    preview.removeAttribute('src');
    preview.alt = '';
  }
  if (card) {
    card.disabled = true;
    card.classList.remove('is-selected');
    card.dataset.emptyLabel = message ? fallbackLabel : 'Not ready';
    card.title = message || '';
  }
};

const clearGeneratedVariants = () => {
  ['ai', 'white', 'lighting'].forEach((name) => {
    photoVariants[name] = '';
    const preview = {
      ai: variantAiPreview,
      white: variantWhitePreview,
      lighting: variantLightingPreview
    }[name];
    const card = variantCards.find((item) => item.dataset.variant === name);
    if (preview) {
      preview.removeAttribute('src');
      preview.alt = '';
    }
    if (card) {
      card.disabled = true;
      card.classList.remove('is-selected');
      card.dataset.emptyLabel = 'Not ready';
      card.title = '';
    }
  });
};

const resetVariantPreviewsForUpload = () => {
  clearGeneratedVariants();
  variantCards.forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.variant === 'original');
  });
  variantOriginalPreview.removeAttribute('src');
  variantOriginalPreview.alt = '';
};

const selectVariant = async (name) => {
  const dataUrl = photoVariants[name];
  if (!dataUrl) {
    return;
  }
  selectedVariant = name;
  variantCards.forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.variant === name);
  });
  processedPhotoDataUrl = dataUrl;
  photoPreview.src = dataUrl;
  try {
    await photoPreview.decode();
  } catch {
    // Preview may still render even if decode is unavailable for a data URL.
  }
  renderPrintSheetPreview();
};

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
    return { isHuman: true, warning: '', eyesClear: true, retakeRequired: false };
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 96;
  canvas.height = 96;
  context.drawImage(photoPreview, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let centralSkinPixels = 0;
  let centralPixels = 0;
  let edgePixels = 0;
  let plainEdgePixels = 0;
  let brightnessTotal = 0;
  let brightnessSquaredTotal = 0;

  for (let y = 12; y < 62; y += 1) {
    for (let x = 24; x < 72; x += 1) {
      const index = (y * canvas.width + x) * 4;
      centralPixels += 1;
      if (isSkinTone(imageData[index], imageData[index + 1], imageData[index + 2])) {
        centralSkinPixels += 1;
      }
    }
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const isEdge = x < 10 || x > 85 || y < 10 || y > 85;
      if (!isEdge) {
        continue;
      }

      const index = (y * canvas.width + x) * 4;
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const brightness = (red + green + blue) / 3;
      const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
      edgePixels += 1;
      brightnessTotal += brightness;
      brightnessSquaredTotal += brightness * brightness;
      if (brightness > 212 && colorSpread < 34) {
        plainEdgePixels += 1;
      }
    }
  }

  const centralSkinRatio = centralSkinPixels / centralPixels;
  const averageBrightness = brightnessTotal / edgePixels;
  const brightnessVariance = Math.max(0, (brightnessSquaredTotal / edgePixels) - (averageBrightness * averageBrightness));
  const brightnessStdDev = Math.sqrt(brightnessVariance);
  const backgroundPlain = plainEdgePixels / edgePixels > 0.58;
  const lightingEven = averageBrightness > 150 && averageBrightness < 248 && brightnessStdDev < 48;

  if (centralSkinRatio < 0.08) {
    return {
      isHuman: false,
      warning: 'No clear human face area detected. Upload a front-facing portrait of one person.',
      backgroundPlain,
      lightingEven
    };
  }

  return { isHuman: true, warning: '', backgroundPlain, lightingEven };
};

const analysisNeedsRetake = (analysis = {}) => {
  const checks = analysis.checks || {};
  const warnings = Array.isArray(analysis.warnings) ? analysis.warnings : [];
  const humanAndFaceItems = [
    ...warnings,
    checks.human,
    checks.eyeClarity
  ].filter(Boolean);
  return (
    analysis.isHuman === false ||
    analysis.eyeClarity === 'warning' ||
    localImageFindings.retakeRequired === true ||
    localImageFindings.eyesClear === false ||
    humanAndFaceItems.some((item) => (
      /no clear human|not a human|not human|does not appear to be a human|human.*not detected|multiple faces|more than one face|not front-facing|side profile/i.test(item) ||
      /eyes?.*(blur|blurry|unclear|closed|obscured|out of focus|not sharp|not clear)/i.test(item) ||
      /(blur|blurry|unclear|obscured|out of focus|not sharp|not clear).*eyes?/i.test(item) ||
      /facial features?.*(blur|blurry|unclear|obscured|out of focus|not sharp|not clear)/i.test(item) ||
      /(blur|blurry|unclear|obscured|out of focus|not sharp|not clear).*facial features?/i.test(item)
    ))
  );
};

const mergeLocalImageFindings = (analysis) => {
  if (localImageFindings.isHuman && localImageFindings.eyesClear !== false && !localImageFindings.retakeRequired) {
    return analysis;
  }

  const localWarnings = [
    localImageFindings.warning,
    localImageFindings.eyesClear === false ? 'Eyes or facial features are not sharp enough. Upload a sharper front-facing photo.' : null
  ].filter(Boolean);

  return {
    ...analysis,
    isHuman: localImageFindings.isHuman === false ? false : analysis.isHuman,
    eyeClarity: localImageFindings.eyesClear === false ? 'warning' : analysis.eyeClarity,
    retakeRequired: localImageFindings.retakeRequired || localImageFindings.isHuman === false || localImageFindings.eyesClear === false || analysis.retakeRequired,
    enhancementAllowed: false,
    warnings: [...localWarnings, ...(analysis.warnings || [])],
    checks: {
      ...(analysis.checks || {}),
      human: localImageFindings.isHuman === false ? localImageFindings.warning : analysis.checks?.human,
      eyeClarity: localImageFindings.eyesClear === false
        ? 'Eyes or facial features are not sharp enough. Retake with a clearer photo.'
        : analysis.checks?.eyeClarity
    }
  };
};

const runAiAssessment = (file) => {
  const name = file.name.toLowerCase();
  const isLikelyNotHuman = /object|pet|car|vehicle|logo|document|landscape|room|food/.test(name) || !localImageFindings.isHuman;
  const hasEyeClarityIssue = /blur|blurry|soft|unclear|out-of-focus|outoffocus|eyes-closed|closed-eye/.test(name) || localImageFindings.eyesClear === false;
  const hasLightingIssue = /dark|shadow|glare|dim|bright/.test(name) || !localImageFindings.lightingEven;
  const hasHeadIssue = /offcenter|off-center|side|tilt|far/.test(name);
  const hasBackgroundIssue = /busy|background|object|room|pattern/.test(name) || !localImageFindings.backgroundPlain;
  const retakeRequired = isLikelyNotHuman || hasEyeClarityIssue;

  currentAiFindings = {
    hasHumanWarning: isLikelyNotHuman,
    hasHeadIssue,
    hasEyeClarityIssue,
    retakeRequired,
    recommendedZoom: 100,
    recommendedRotation: 0
  };
  applySuggestionButton.hidden = false;
  humanWarning.hidden = !retakeRequired;
  humanWarning.textContent = hasEyeClarityIssue
    ? 'Warning: eyes or facial features are not clear enough. Upload a sharper front-facing photo; AI will not alter facial details.'
    : 'Warning: this does not appear to be a human passport-style portrait. Upload a front-facing photo of one person.';
  aiStatus.textContent = retakeRequired ? 'Retake needed' : 'AI preview';
  aiStatus.classList.toggle('is-warning', retakeRequired || hasLightingIssue || hasHeadIssue || hasBackgroundIssue);

  if (retakeRequired) {
    setChecklistItem('human', 'warning', 'Human subject needs review');
    setChecklistItem('head', 'warning', `${activeSpec.head} blocked`);
    setChecklistItem('background', 'warning', 'Background check blocked');
    setChecklistItem('lighting', 'warning', hasEyeClarityIssue ? 'Retake: eyes unclear' : `${activeSpec.eyes} blocked`);
  }

  setAiCheck(
    'human',
    isLikelyNotHuman ? 'warning' : 'pass',
    isLikelyNotHuman
      ? (localImageFindings.warning || 'No clear human portrait detected in this prototype state.')
      : 'Looks like a single front-facing portrait.'
  );
  setAiCheck(
    'lighting',
    hasEyeClarityIssue || hasLightingIssue ? 'warning' : 'pass',
    hasEyeClarityIssue
      ? 'Eyes or facial features are blurred or unclear. Upload a new sharper photo instead of enhancing.'
      : hasLightingIssue
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
  const hasEyeClarityIssue = analysis.eyeClarity === 'warning' || analysisNeedsRetake(analysis);
  const hasLightingIssue = analysis.lighting === 'warning';
  const hasHeadIssue = analysis.headCentered === 'warning';
  const hasBackgroundIssue = analysis.background === 'warning';
  const retakeRequired = hasHumanWarning || hasEyeClarityIssue;

  currentAiFindings = {
    hasHumanWarning,
    hasEyeClarityIssue,
    hasHeadIssue,
    retakeRequired,
    recommendedZoom: Number(analysis.recommendedZoom || 100),
    recommendedRotation: Number(analysis.recommendedRotation || 0)
  };

  humanWarning.hidden = !retakeRequired;
  humanWarning.textContent = warnings[0] || (hasEyeClarityIssue
    ? 'Warning: eyes or facial features are not clear enough. Upload a sharper front-facing photo; AI will not alter facial details.'
    : 'Warning: upload a front-facing photo of one person.');
  aiStatus.textContent = retakeRequired ? 'Retake needed' : 'AI preview';
  aiStatus.classList.toggle('is-warning', retakeRequired || hasLightingIssue || hasHeadIssue || hasBackgroundIssue);
  applySuggestionButton.hidden = false;

  if (retakeRequired) {
    setChecklistItem('human', 'warning', 'Human subject needs review');
    setChecklistItem('head', 'warning', `${activeSpec.head} blocked`);
    setChecklistItem('background', 'warning', 'Background check blocked');
    setChecklistItem('lighting', 'warning', hasEyeClarityIssue ? 'Retake: eyes unclear' : `${activeSpec.eyes} blocked`);
  } else {
    setChecklistItem('human', 'pass', 'Human subject');
    setChecklistItem('background', hasBackgroundIssue ? 'warning' : 'pass', hasBackgroundIssue ? 'Background needs review' : 'Background: plain white');
    setChecklistItem('lighting', hasLightingIssue ? 'warning' : 'pass', hasLightingIssue ? 'Lighting needs review' : activeSpec.eyes);
  }

  setAiCheck(
    'human',
    hasHumanWarning ? 'warning' : 'pass',
    analysis.checks?.human || (hasHumanWarning
      ? 'No clear human passport-style portrait detected.'
      : 'Looks like a single front-facing portrait.')
  );
  setAiCheck(
    'lighting',
    hasEyeClarityIssue || hasLightingIssue ? 'warning' : 'pass',
    analysis.checks?.eyeClarity || analysis.checks?.lighting || (hasEyeClarityIssue
      ? 'Eyes or facial features are blurred or unclear. Upload a new sharper photo instead of enhancing.'
      : hasLightingIssue
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
        imageDataUrl: await buildAdjustedPhotoDataUrl(),
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

const requestPhotoSuggestion = async (file) => {
  if (!currentPhotoDataUrl) {
    return;
  }

  const requestId = ++suggestionRequestId;
  aiStatus.textContent = 'Preparing options...';
  advisorSummary.textContent = 'AI is checking the photo against the selected passport spec.';
  aiStatus.classList.remove('is-warning');

  try {
    const response = await fetch('/api/photo/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: await buildAdjustedPhotoDataUrl(),
        filename: file.name,
        country: country.value,
        documentType: documentType.value
      })
    });
    const suggestion = await response.json();
    const analysis = mergeLocalImageFindings(suggestion.analysis || suggestion);
    if (requestId !== suggestionRequestId || !currentImageFile) {
      return;
    }

    applyAiFindings(analysis);
    if (analysisNeedsRetake(analysis)) {
      await setVariant('ai', '');
      await setVariant('white', '');
      await setVariant('lighting', '');
      advisorSummary.textContent = analysis.eyeClarity === 'warning'
        ? 'Retake recommended: eyes or facial features are not clear enough. Upload a sharper front-facing photo.'
        : 'Retake recommended: upload a clear front-facing human passport photo before using AI suggestions.';
      return;
    }
    await setVariant('ai', suggestion.variants?.aiSuggestedDataUrl || '');
    await setVariant('white', suggestion.variants?.whiteBackgroundDataUrl || '');
    await setVariant('lighting', suggestion.variants?.lightingDataUrl || await buildAdjustedPhotoDataUrl({ forceLighting: true }));
    if (!suggestion.variants?.aiSuggestedDataUrl && suggestion.variantErrors?.aiSuggested) {
      setVariantError('ai', suggestion.variantErrors.aiSuggested, 'AI edit failed');
    }
    if (!suggestion.variants?.whiteBackgroundDataUrl && suggestion.variantErrors?.whiteBackground) {
      try {
        await setVariant('white', await buildLocalBackgroundRemovalDataUrl({ backgroundColor: '#ffffff' }));
        advisorSummary.textContent = `${suggestion.message || 'AI background editing failed.'} A local background preview is available for the white-background option.`;
      } catch {
        setVariantError('white', suggestion.variantErrors.whiteBackground, 'White edit failed');
      }
    }
    if (analysis.isHuman !== false && suggestion.message && suggestion.mode !== 'server fallback') {
      advisorSummary.textContent = suggestion.message;
    }
  } catch {
    if (requestId !== suggestionRequestId || !currentImageFile) {
      return;
    }
    await setVariant('lighting', await buildAdjustedPhotoDataUrl({ forceLighting: true }));
    runAiAssessment(file);
    advisorSummary.textContent = 'AI suggested photo is unavailable, so SnapPass kept the original and offered a safe lighting preview.';
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
  applySpecLabels();
  if (currentImageFile) {
    setChecklistItem('size', 'pass', activeSpec.checklistSize);
    setChecklistItem('head', currentAiFindings.hasHeadIssue ? 'warning' : 'pass', currentAiFindings.hasHeadIssue ? 'Headshot needs adjustment' : activeSpec.head);
    renderPrintSheetPreview();
    requestPhotoSuggestion(currentImageFile);
  }
};

const updatePreviewTransform = () => {
  const zoom = Number(zoomRange.value);
  const rotate = Number(rotateRange.value);
  clampPreviewPan();
  zoomValue.textContent = `${zoom}%`;
  rotateValue.textContent = `${rotate}°`;
  syncPassportBackgroundColor();
  photoFrame.style.setProperty('--preview-zoom', String(zoom / 100));
  photoFrame.style.setProperty('--preview-rotate', `${rotate}deg`);
  photoFrame.style.setProperty('--preview-pan-x', `${previewPanX}%`);
  photoFrame.style.setProperty('--preview-pan-y', `${previewPanY}%`);
  syncVariantPreviewTransform();
  evaluateCropFit();
  renderPrintSheetPreview();
  queueAdjustedVariantRefresh();
};

const syncVariantPreviewTransform = () => {
  const zoom = Number(zoomRange.value) / 100;
  const rotate = Number(rotateRange.value);
  variantPanel.style.setProperty('--preview-zoom', String(zoom));
  variantPanel.style.setProperty('--preview-rotate', `${rotate}deg`);
  variantPanel.style.setProperty('--preview-pan-x', `${previewPanX}%`);
  variantPanel.style.setProperty('--preview-pan-y', `${previewPanY}%`);
};

const getPassportBackgroundColor = () => (
  selectedBackgroundMode === 'ai-cleanup' ? '#fbfaf4' : '#ffffff'
);

const hexToRgb = (hexColor) => {
  const clean = hexColor.replace('#', '');
  const value = parseInt(clean.length === 3
    ? clean.split('').map((part) => part + part).join('')
    : clean, 16);
  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255
  };
};

const colorDistance = (a, b) => Math.sqrt(
  ((a.red - b.red) ** 2) +
  ((a.green - b.green) ** 2) +
  ((a.blue - b.blue) ** 2)
);

const isProtectedPortraitPixel = (x, y, width, height) => {
  const nx = x / width;
  const ny = y / height;
  const headDx = (nx - 0.5) / 0.28;
  const headDy = (ny - 0.38) / 0.32;
  const torsoDx = (nx - 0.5) / 0.48;
  const torsoDy = (ny - 0.78) / 0.32;
  const centralColumn = nx > 0.28 && nx < 0.72 && ny > 0.16 && ny < 0.94;

  return (
    (headDx * headDx) + (headDy * headDy) < 1 ||
    (torsoDx * torsoDx) + (torsoDy * torsoDy) < 1 ||
    centralColumn
  );
};

const buildLocalBackgroundRemovalDataUrl = async (options = {}) => {
  const sourceDataUrl = options.sourceDataUrl || currentPhotoDataUrl;
  if (!sourceDataUrl) {
    return '';
  }

  const image = await loadImage(sourceDataUrl);
  const sourceWidth = image.naturalWidth || image.width || DEFAULT_OUTPUT_SIZE;
  const sourceHeight = image.naturalHeight || image.height || DEFAULT_OUTPUT_SIZE;
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const scale = maxSide > 1200 ? 1200 / maxSide : 1;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const edgeSample = { red: 0, green: 0, blue: 0, count: 0 };
  const samplePixel = (x, y) => {
    const index = (y * canvas.width + x) * 4;
    edgeSample.red += pixels[index];
    edgeSample.green += pixels[index + 1];
    edgeSample.blue += pixels[index + 2];
    edgeSample.count += 1;
  };

  const step = Math.max(1, Math.round(Math.min(canvas.width, canvas.height) / 90));
  for (let x = 0; x < canvas.width; x += step) {
    samplePixel(x, 0);
    samplePixel(x, canvas.height - 1);
  }
  for (let y = 0; y < canvas.height; y += step) {
    samplePixel(0, y);
    samplePixel(canvas.width - 1, y);
  }

  const edgeColor = {
    red: edgeSample.red / edgeSample.count,
    green: edgeSample.green / edgeSample.count,
    blue: edgeSample.blue / edgeSample.count
  };
  const fillColor = hexToRgb(options.backgroundColor || getPassportBackgroundColor());
  const visited = new Uint8Array(canvas.width * canvas.height);
  const queue = [];

  const isLikelyBackgroundPixel = (x, y) => {
    if (isProtectedPortraitPixel(x, y, canvas.width, canvas.height)) {
      return false;
    }

    const index = (y * canvas.width + x) * 4;
    const pixel = {
      red: pixels[index],
      green: pixels[index + 1],
      blue: pixels[index + 2]
    };
    const brightness = (pixel.red + pixel.green + pixel.blue) / 3;
    const spread = Math.max(pixel.red, pixel.green, pixel.blue) - Math.min(pixel.red, pixel.green, pixel.blue);
    const distanceFromEdge = colorDistance(pixel, edgeColor);
    const plainLightBackdrop = brightness > 202 && spread < 48;
    const darkBackdrop = brightness < 112 && distanceFromEdge < 122;

    return distanceFromEdge < 96 || plainLightBackdrop || darkBackdrop;
  };

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      return;
    }
    const position = y * canvas.width + x;
    if (visited[position] || !isLikelyBackgroundPixel(x, y)) {
      return;
    }
    visited[position] = 1;
    queue.push(position);
  };

  for (let x = 0; x < canvas.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, canvas.height - 1);
  }
  for (let y = 0; y < canvas.height; y += 1) {
    enqueue(0, y);
    enqueue(canvas.width - 1, y);
  }

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const position = queue[queueIndex];
    queueIndex += 1;
    const x = position % canvas.width;
    const y = Math.floor(position / canvas.width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let position = 0; position < visited.length; position += 1) {
    if (!visited[position]) {
      continue;
    }
    const index = position * 4;
    pixels[index] = fillColor.red;
    pixels[index + 1] = fillColor.green;
    pixels[index + 2] = fillColor.blue;
    pixels[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

const syncPassportBackgroundColor = () => {
  const backgroundColor = getPassportBackgroundColor();
  photoFrame.style.setProperty('--passport-slot-bg', backgroundColor);
  variantPanel.style.setProperty('--passport-slot-bg', backgroundColor);
  printPreviewPanel.style.setProperty('--passport-slot-bg', backgroundColor);
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', reject);
  image.src = src;
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPreviewPanLimit = () => {
  const zoom = Number(zoomRange.value) || 100;
  return Math.min(90, Math.max(24, 24 + Math.max(0, zoom - 100) * 0.44));
};

const clampPreviewPan = () => {
  const panLimit = getPreviewPanLimit();
  previewPanX = clamp(previewPanX, -panLimit, panLimit);
  previewPanY = clamp(previewPanY, -panLimit, panLimit);
};

const processPhotoDataUrl = async (sourceDataUrl, options = {}) => {
  const shouldEnhanceLighting = options.forceLighting || lightingMode.value === 'auto-enhance';
  if (!shouldEnhanceLighting) {
    return sourceDataUrl;
  }

  const image = await loadImage(sourceDataUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  let brightnessTotal = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    brightnessTotal += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
  }
  const averageBrightness = brightnessTotal / (pixels.length / 4);
  const lift = shouldEnhanceLighting ? clamp(188 - averageBrightness, -18, 30) : 0;
  const contrast = shouldEnhanceLighting ? 1.06 : 1;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];

    if (shouldEnhanceLighting) {
      pixels[index] = clamp((red - 128) * contrast + 128 + lift, 0, 255);
      pixels[index + 1] = clamp((green - 128) * contrast + 128 + lift, 0, 255);
      pixels[index + 2] = clamp((blue - 128) * contrast + 128 + lift, 0, 255);
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

const buildAdjustedPhotoDataUrl = async (options = {}) => {
  if (!currentImageFile || !photoPreview.complete || !photoPreview.naturalWidth) {
    return currentPhotoDataUrl;
  }

  const canvas = document.createElement('canvas');
  canvas.width = activeSpec.outputWidth || DEFAULT_OUTPUT_SIZE;
  canvas.height = activeSpec.outputHeight || DEFAULT_OUTPUT_SIZE;
  drawPhotoToCanvas(canvas, { width: canvas.width, height: canvas.height });
  const adjustedDataUrl = canvas.toDataURL('image/png');
  if (options.forceLighting) {
    return processPhotoDataUrl(adjustedDataUrl, { forceLighting: true });
  }
  return adjustedDataUrl;
};

const refreshAdjustedVariantPreviews = async () => {
  if (!currentImageFile || !currentPhotoDataUrl || !photoPreview.complete || !photoPreview.naturalWidth) {
    return;
  }

  const requestId = ++adjustedPreviewRefreshId;
  syncVariantPreviewTransform();
  variantOriginalPreview.src = currentPhotoDataUrl;
  variantOriginalPreview.alt = 'Adjusted original passport photo preview';

  if (!currentAiFindings.retakeRequired && !variantCards.find((item) => item.dataset.variant === 'lighting')?.disabled) {
    const lightingDataUrl = await processPhotoDataUrl(currentPhotoDataUrl, { forceLighting: true });
    if (requestId !== adjustedPreviewRefreshId || !currentImageFile) {
      return;
    }
    variantLightingPreview.src = lightingDataUrl;
    variantLightingPreview.alt = 'Lighting enhanced adjusted passport photo preview';
  }
};

const queueAdjustedVariantRefresh = () => {
  if (!currentImageFile || !currentPhotoDataUrl) {
    return;
  }

  window.clearTimeout(adjustedPreviewTimer);
  adjustedPreviewTimer = window.setTimeout(() => {
    refreshAdjustedVariantPreviews();
  }, 100);
};

const applyClientPhotoProcessing = async () => {
  if (!currentPhotoDataUrl) {
    return;
  }

  const requestId = ++processingRequestId;
  const sourceDataUrl = backgroundResultDataUrl || currentPhotoDataUrl;
  try {
    processedPhotoDataUrl = await processPhotoDataUrl(sourceDataUrl);
    if (requestId !== processingRequestId || !currentImageFile) {
      return;
    }
    photoPreview.src = processedPhotoDataUrl;
    await photoPreview.decode();
    renderPrintSheetPreview();
  } catch {
    if (requestId !== processingRequestId || !currentImageFile) {
      return;
    }
    processedPhotoDataUrl = sourceDataUrl;
    photoPreview.src = sourceDataUrl;
    renderPrintSheetPreview();
  }
};

const applyLocalBackgroundFallback = async (message = '') => {
  const backgroundColor = selectedBackgroundMode === 'ai-cleanup' ? '#fbfaf4' : '#ffffff';
  const localBackgroundDataUrl = await buildLocalBackgroundRemovalDataUrl({ backgroundColor });
  if (!localBackgroundDataUrl) {
    backgroundNote.textContent = message || 'Background cleanup is temporarily unavailable. Keeping the selected photo unchanged.';
    return false;
  }

  backgroundResultDataUrl = localBackgroundDataUrl;
  const variantName = selectedBackgroundMode === 'ai-cleanup' ? 'ai' : 'white';
  await setVariant(variantName, localBackgroundDataUrl);
  await selectVariant(variantName);
  setChecklistItem('background', 'pass', selectedBackgroundMode === 'ai-cleanup' ? 'Background cleaned' : 'Background: plain white');
  setAiCheck('background', 'pass', 'Local background preview filled exposed background areas while preserving the original face.');
  backgroundNote.textContent = message
    ? `${message} Local background preview filled exposed areas with ${selectedBackgroundMode === 'ai-cleanup' ? 'off-white' : 'white'}.`
    : `Local background preview filled exposed areas with ${selectedBackgroundMode === 'ai-cleanup' ? 'off-white' : 'white'}.`;
  return true;
};

const requestBackgroundEdit = async () => {
  if (!currentImageFile || !currentPhotoDataUrl || selectedBackgroundMode === 'keep-original') {
    return;
  }

  const requestId = ++backgroundRequestId;
  backgroundNote.textContent = selectedBackgroundMode === 'ai-cleanup'
    ? 'Cleaning background while preserving facial features...'
    : selectedBackgroundMode === 'remove-background'
      ? 'Removing the background and filling exposed areas...'
      : 'Replacing background with white...';

  try {
    const response = await fetch('/api/photo/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: await buildAdjustedPhotoDataUrl(),
        mode: selectedBackgroundMode,
        country: country.value,
        documentType: documentType.value
      })
    });
    const result = await response.json();
    if (requestId !== backgroundRequestId || !currentImageFile || backgroundMode.value !== selectedBackgroundMode) {
      return;
    }

    backgroundResultDataUrl = result.imageDataUrl || '';
    if (backgroundResultDataUrl) {
      photoFrame.classList.remove('subject-mask');
      backgroundNote.textContent = result.message || 'AI background cleanup applied.';
      const variantName = selectedBackgroundMode === 'ai-cleanup' ? 'ai' : 'white';
      await setVariant(variantName, backgroundResultDataUrl);
      await selectVariant(variantName);
      return;
    }

    photoFrame.classList.remove('subject-mask');
    await applyLocalBackgroundFallback(result.message || 'AI cleanup is not configured on this server yet.');
  } catch {
    if (requestId !== backgroundRequestId || !currentImageFile) {
      return;
    }
    backgroundResultDataUrl = '';
    photoFrame.classList.remove('subject-mask');
    await applyLocalBackgroundFallback('AI cleanup is unavailable.');
  }
};

const applyBackgroundMode = () => {
  selectedBackgroundMode = backgroundMode.value;
  backgroundRequestId += 1;
  processingRequestId += 1;
  backgroundResultDataUrl = '';
  photoFrame.classList.toggle('background-white', selectedBackgroundMode === 'replace-white' || selectedBackgroundMode === 'remove-background');
  photoFrame.classList.toggle('background-soft-white', selectedBackgroundMode === 'ai-cleanup');
  photoFrame.classList.remove('subject-mask');
  renderPrintSheetPreview();

  const backgroundMessages = {
    'keep-original': 'Use a plain white or off-white background for most passport photos.',
    'replace-white': 'Requesting a strict white-background-only variant. The original stays available.',
    'remove-background': 'Removing the existing background and filling exposed areas with white.',
    'ai-cleanup': 'Requesting a recommended compliant background while preserving facial features.'
  };

  backgroundNote.textContent = backgroundMessages[selectedBackgroundMode];

  if (!currentImageFile) {
    return;
  }

  if (selectedBackgroundMode === 'keep-original') {
    selectVariant(selectedVariant && photoVariants[selectedVariant] ? selectedVariant : 'original');
    if (localImageFindings.backgroundPlain) {
      setChecklistItem('background', 'pass', 'Background: plain white');
      setAiCheck('background', 'pass', 'Background appears plain white or off-white.');
      return;
    }

    setChecklistItem('background', 'warning', 'Background needs review');
    setAiCheck('background', 'warning', 'Original background may not be plain white or off-white.');
    return;
  }

  if (currentAiFindings.retakeRequired) {
    setChecklistItem('background', 'warning', 'Retake before cleanup');
    setAiCheck('background', 'warning', 'AI cleanup is disabled because eyes or facial features are not clear enough.');
    backgroundNote.textContent = 'Upload a sharper front-facing photo before using AI background cleanup.';
    return;
  }

  setChecklistItem('background', 'warning', 'AI background pending');
  setAiCheck('background', 'warning', selectedBackgroundMode === 'ai-cleanup'
    ? 'AI suggested photo is choosing a recommended compliant background on the server.'
    : 'White background variant is changing only the background to white.');
  requestBackgroundEdit();
};

const applyLightingMode = async () => {
  if (!currentImageFile) {
    return;
  }

  if (lightingMode.value === 'auto-enhance') {
    if (currentAiFindings.retakeRequired) {
      setChecklistItem('lighting', 'warning', 'Retake: eyes unclear');
      setAiCheck('lighting', 'warning', 'Lighting enhancement is disabled because eyes or facial features are not clear enough.');
      backgroundNote.textContent = 'Upload a sharper front-facing photo before using lighting enhancement.';
      await selectVariant('original');
      return;
    }
    const lightingDataUrl = photoVariants.lighting || await processPhotoDataUrl(currentPhotoDataUrl, { forceLighting: true });
    await setVariant('lighting', lightingDataUrl);
    await selectVariant('lighting');
    setChecklistItem('lighting', 'pass', 'Lighting enhanced');
    setAiCheck('lighting', 'pass', 'Lighting is gently balanced while preserving the original face.');
    if (selectedBackgroundMode === 'keep-original') {
      backgroundNote.textContent = 'Auto lighting is on. The exported photo uses a gentle brightness and contrast balance.';
    }
  } else if (localImageFindings.lightingEven) {
    setChecklistItem('lighting', 'warning', 'Lighting needs review');
    setAiCheck('lighting', 'warning', 'Lighting appears even, but SnapPass still recommends a quick review for shadows or glare.');
  }
};

const evaluateCropFit = () => {
  if (!currentImageFile) {
    return;
  }

  const zoom = Number(zoomRange.value);
  const rotate = Math.abs(Number(rotateRange.value));
  const pan = Math.max(Math.abs(previewPanX), Math.abs(previewPanY));
  const panLimit = getPreviewPanLimit();
  const panRatio = panLimit ? pan / panLimit : 0;
  const isDanger = zoom < 84 || rotate > 7 || panRatio > 0.98;
  const isWarning = !isDanger && (zoom < 90 || zoom > 210 || rotate > 4 || panRatio > 0.84);

  statusPill.classList.toggle('is-danger', isDanger);
  statusPill.classList.toggle('is-warning', isWarning && !isDanger);

  if (currentAiFindings.hasHumanWarning) {
    statusPill.textContent = 'Retake needed';
    statusPill.classList.add('is-warning');
    setChecklistItem('head', 'warning', `${activeSpec.head} blocked`);
    setAiCheck('head', 'warning', 'Head geometry cannot be checked until a human passport-style portrait is detected.');
    return;
  }

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
  setChecklistItem('head', 'pass', activeSpec.head);
  setAiCheck('head', 'pass', 'Head appears centered inside the guide.');
};

const showLoadedState = async (file) => {
  currentImageFile = file;
  currentPhotoDataUrl = '';
  backgroundResultDataUrl = '';
  processedPhotoDataUrl = '';
  selectedVariant = 'original';
  photoVariants = {
    original: '',
    ai: '',
    white: '',
    lighting: ''
  };
  resetVariantPreviewsForUpload();
  selectRandomQuote();
  photoPreview.src = URL.createObjectURL(file);
  photoPreview.alt = `Preview of ${file.name}`;
  photoFrame.classList.add('has-photo');
  adjustmentPanel.hidden = false;
  exportPanel.hidden = false;
  printPreviewPanel.hidden = false;
  variantPanel.hidden = false;
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
    await setVariant('original', currentPhotoDataUrl);
    await selectVariant('original');
    localImageFindings = analyzePortraitPixels();
    applyBackgroundMode();
    await applyLightingMode();
    runAiAssessment(file);
    await requestPhotoSuggestion(file);
  } catch {
    runAiAssessment(file);
  }
};

const resetState = () => {
  currentImageFile = null;
  currentPhotoDataUrl = '';
  backgroundResultDataUrl = '';
  processedPhotoDataUrl = '';
  selectedVariant = 'original';
  photoVariants = {
    original: '',
    ai: '',
    white: '',
    lighting: ''
  };
  selectedBackgroundMode = 'keep-original';
  analysisRequestId += 1;
  backgroundRequestId += 1;
  processingRequestId += 1;
  suggestionRequestId += 1;
  adjustedPreviewRefreshId += 1;
  currentAiFindings = {
    hasHumanWarning: false,
    hasHeadIssue: false,
    hasEyeClarityIssue: false,
    retakeRequired: false,
    recommendedZoom: 100,
    recommendedRotation: 0
  };
  currentPrintQuote = PRINT_QUOTES[0];
  window.__snapPassQuote = currentPrintQuote;
  previewPanX = 0;
  previewPanY = 0;
  dragState = null;
  window.clearTimeout(adjustedPreviewTimer);
  adjustedPreviewTimer = null;
  stopPhoneUploadPolling();
  closeCameraModal();
  localImageFindings = {
    isHuman: true,
    warning: '',
    backgroundPlain: true,
    lightingEven: true,
    eyesClear: true,
    retakeRequired: false
  };
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  photoPreview.alt = '';
  photoFrame.classList.remove('has-photo');
  photoFrame.classList.remove('background-white', 'background-soft-white', 'subject-mask', 'is-dragging');
  adjustmentPanel.hidden = true;
  exportPanel.hidden = true;
  printPreviewPanel.hidden = true;
  variantPanel.hidden = true;
  variantCards.forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.variant === 'original');
    card.disabled = card.dataset.variant !== 'original';
  });
  [variantOriginalPreview, variantAiPreview, variantWhitePreview, variantLightingPreview].forEach((preview) => {
    preview.removeAttribute('src');
    preview.alt = '';
  });
  zoomRange.value = '100';
  rotateRange.value = '0';
  backgroundMode.value = 'keep-original';
  lightingMode.value = 'keep-original';
  printOrderStatus.textContent = 'Walgreens is first. CVS support can plug into the same handoff later.';
  printOrderButton.disabled = false;
  applyBackgroundMode();
  statusPill.textContent = 'Ready';
  statusPill.classList.remove('is-warning', 'is-danger');
  setChecklist('ready');
  resetAiAssessment();
  updatePreviewTransform();
  clearPrintSheetPreview();
};

const stopPhoneUploadPolling = () => {
  if (phoneUploadPollTimer) {
    clearInterval(phoneUploadPollTimer);
    phoneUploadPollTimer = null;
  }
};

const closePhoneUploadModal = () => {
  phoneUploadModal.hidden = true;
  stopPhoneUploadPolling();
};

const stopCameraStream = () => {
  if (!cameraStream) {
    return;
  }
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
};

const closeCameraModal = () => {
  cameraModal.hidden = true;
  captureCameraButton.disabled = true;
  flipCameraButton.disabled = false;
  stopCameraStream();
};

const updateCameraFlipButton = () => {
  flipCameraButton.textContent = cameraFacingMode === 'environment'
    ? 'Use front camera'
    : 'Use back camera';
};

const startCameraStream = async () => {
  stopCameraStream();
  captureCameraButton.disabled = true;
  flipCameraButton.disabled = true;
  updateCameraFlipButton();
  cameraStatus.textContent = cameraFacingMode === 'environment'
    ? 'Opening back camera...'
    : 'Opening front camera...';

  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: cameraFacingMode },
      width: { ideal: 1280 },
      height: { ideal: 1280 }
    },
    audio: false
  });
  cameraVideo.srcObject = cameraStream;
  await cameraVideo.play();
  captureCameraButton.disabled = false;
  flipCameraButton.disabled = false;
  cameraStatus.textContent = cameraFacingMode === 'environment'
    ? 'Back camera ready. Ask the person to face the camera, keep the background plain, then capture.'
    : 'Front camera ready. Use the back camera when possible for sharper passport photos.';
};

const openCameraModal = async () => {
  cameraModal.hidden = false;
  captureCameraButton.disabled = true;
  cameraFacingMode = 'environment';
  updateCameraFlipButton();
  cameraStatus.textContent = 'Opening back camera...';

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'Camera capture needs HTTPS, localhost, and browser camera permission. Use the upload button if this file preview cannot access the camera.';
    return;
  }

  try {
    await startCameraStream();
  } catch {
    cameraStatus.textContent = 'Camera permission was blocked or unavailable. Run SnapPass from HTTPS or localhost and allow camera access.';
    flipCameraButton.disabled = false;
  }
};

const flipCamera = async () => {
  if (cameraModal.hidden || !navigator.mediaDevices?.getUserMedia) {
    return;
  }

  cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
  try {
    await startCameraStream();
  } catch {
    cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    updateCameraFlipButton();
    captureCameraButton.disabled = !cameraStream;
    flipCameraButton.disabled = false;
    cameraStatus.textContent = 'Could not switch cameras. Continue with the active camera or check browser permissions.';
  }
};

const captureCameraPhoto = async () => {
  if (!cameraStream || !cameraVideo.videoWidth || !cameraVideo.videoHeight) {
    cameraStatus.textContent = 'Camera is not ready yet. Wait for the preview to appear.';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext('2d').drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    cameraStatus.textContent = 'Could not capture this frame. Try again.';
    return;
  }

  const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
  closeCameraModal();
  await showLoadedState(file);
};

const pollPhoneUpload = async () => {
  if (!phoneUploadSession) {
    return;
  }

  try {
    const response = await fetch(`/api/mobile-upload/${encodeURIComponent(phoneUploadSession)}`);
    if (!response.ok) {
      return;
    }

    const result = await response.json();
    if (result.status !== 'ready' || !result.imageDataUrl) {
      return;
    }

    phoneUploadStatus.textContent = 'Photo received. Preparing preview...';
    const file = await dataUrlToFile(result.imageDataUrl, result.filename || 'phone-upload.png');
    closePhoneUploadModal();
    await showLoadedState(file);
  } catch {
    phoneUploadStatus.textContent = 'Still waiting. Make sure the phone can reach this SnapPass URL.';
  }
};

const openPhoneUploadModal = () => {
  phoneUploadSession = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const canUseServerUpload = /^https?:$/.test(window.location.protocol);
  const baseUrl = canUseServerUpload
    ? window.location.origin
    : 'https://snappass.me';
  const uploadUrl = `${baseUrl}/mobile-upload.html?session=${encodeURIComponent(phoneUploadSession)}`;

  phoneUploadLink.href = uploadUrl;
  phoneUploadQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uploadUrl)}`;
  phoneUploadModal.hidden = false;
  phoneUploadStatus.textContent = canUseServerUpload
    ? 'Scan this code with your phone, choose a photo, and SnapPass will load it here.'
    : 'QR phone upload works when SnapPass is running from a server or deployed URL. This file preview can show the handoff link only.';

  stopPhoneUploadPolling();
  if (canUseServerUpload) {
    phoneUploadPollTimer = setInterval(pollPhoneUpload, 1500);
  }
};

const fillCanvasBackground = (context, canvas) => {
  context.fillStyle = getPassportBackgroundColor();
  context.fillRect(0, 0, canvas.width, canvas.height);
};

const drawPhotoToCanvas = (canvas, options = {}) => {
  const context = canvas.getContext('2d');
  const zoom = Number(zoomRange.value) / 100;
  const rotate = Number(rotateRange.value) * Math.PI / 180;
  const width = options.width || options.size || canvas.width;
  const height = options.height || options.size || canvas.height;

  fillCanvasBackground(context, canvas);

  context.save();
  context.translate(
    canvas.width / 2 + (canvas.width * previewPanX / 100),
    canvas.height / 2 + (canvas.height * previewPanY / 100)
  );
  context.rotate(rotate);
  context.scale(zoom, zoom);

  const drawSubject = () => drawImageContain(context, photoPreview, -width / 2, -height / 2, width, height);

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

const drawImageContain = (context, image, x, y, width, height) => {
  const sourceWidth = image.naturalWidth || image.videoWidth || width;
  const sourceHeight = image.naturalHeight || image.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio;
  } else {
    drawWidth = height * sourceRatio;
  }

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
};

const getPrintSheetPositions = (scale = 1) => {
  const width = activeSpec.outputWidth * scale;
  const height = activeSpec.outputHeight * scale;
  return [
    [0, 0, width, height],
    [width, 0, width, height],
    [0, height, width, height],
    [width, height, width, height]
  ];
};

const drawPrintQuote = (context, scale = 1) => {
  const quoteX = activeSpec.outputWidth * 2 * scale;
  const quoteWidth = Math.max(PRINT_SHEET_WIDTH * scale - quoteX, activeSpec.outputWidth * scale * 0.8);
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
  const scaledPhotoWidth = activeSpec.outputWidth * scale;
  const scaledPhotoHeight = activeSpec.outputHeight * scale;
  photoCanvas.width = scaledPhotoWidth;
  photoCanvas.height = scaledPhotoHeight;
  drawPhotoToCanvas(photoCanvas, { width: scaledPhotoWidth, height: scaledPhotoHeight });

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  getPrintSheetPositions(scale).forEach(([x, y, width, height]) => {
    context.drawImage(photoCanvas, x, y, width, height);
    context.strokeStyle = '#d5e4dd';
    context.lineWidth = Math.max(1, 2 * scale);
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
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
  canvas.width = activeSpec.outputWidth || DEFAULT_OUTPUT_SIZE;
  canvas.height = activeSpec.outputHeight || DEFAULT_OUTPUT_SIZE;
  drawPhotoToCanvas(canvas, { width: canvas.width, height: canvas.height });
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

const buildPrintableSheetDataUrl = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_SHEET_WIDTH;
  canvas.height = PRINT_SHEET_HEIGHT;
  drawPrintSheet(canvas);
  return canvas.toDataURL('image/png');
};

const parsePrintContact = (value = '') => {
  const contact = value.trim();
  if (contact.includes('@')) {
    return { email: contact, phone: '' };
  }
  return { email: '', phone: contact };
};

const submitPrintOrder = async (event) => {
  event.preventDefault();
  if (!currentImageFile) {
    printOrderStatus.textContent = 'Upload and review a photo before requesting pickup.';
    return;
  }

  const zip = printZip.value.trim();
  const contact = parsePrintContact(printContact.value);
  if (!zip || (!contact.email && !contact.phone)) {
    printOrderStatus.textContent = 'Enter a ZIP code and email or phone for pickup.';
    return;
  }

  printOrderButton.disabled = true;
  printOrderStatus.textContent = 'Preparing Walgreens handoff...';

  try {
    const response = await fetch('/api/print/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'walgreens',
        zip,
        customer: contact,
        product: {
          type: '4x6',
          quantity: 1
        },
        image: {
          kind: 'passport_sheet_4x6',
          dataUrl: buildPrintableSheetDataUrl()
        }
      })
    });
    const result = await response.json();
    printOrderStatus.textContent = result.message || `Walgreens handoff status: ${result.status || response.status}`;
  } catch {
    printOrderStatus.textContent = 'Walgreens handoff is unavailable right now. Download the 4x6 sheet and try again later.';
  } finally {
    printOrderButton.disabled = false;
  }
};

country.addEventListener('change', updateRequirementSummary);
documentType.addEventListener('change', updateRequirementSummary);

photoInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  loadPhotoFile(file);
});

zoomRange.addEventListener('input', updatePreviewTransform);
rotateRange.addEventListener('input', updatePreviewTransform);
backgroundMode.addEventListener('change', applyBackgroundMode);
lightingMode.addEventListener('change', applyLightingMode);

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

photoStage.addEventListener('dragenter', (event) => {
  event.preventDefault();
  photoStage.classList.add('is-drop-ready');
});

photoStage.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  photoStage.classList.add('is-drop-ready');
});

photoStage.addEventListener('dragleave', (event) => {
  if (!photoStage.contains(event.relatedTarget)) {
    photoStage.classList.remove('is-drop-ready');
  }
});

photoStage.addEventListener('drop', (event) => {
  event.preventDefault();
  photoStage.classList.remove('is-drop-ready');
  const [file] = Array.from(event.dataTransfer.files || []);
  loadPhotoFile(file);
});

applySuggestionButton.addEventListener('click', () => {
  zoomRange.value = String(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentAiFindings.recommendedZoom || 100)));
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
    panY: previewPanY,
    hasMoved: false
  };
  photoFrame.classList.add('is-dragging');
  photoFrame.setPointerCapture(event.pointerId);
});

photoFrame.addEventListener('pointermove', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const bounds = photoFrame.getBoundingClientRect();
  const movement = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
  dragState.hasMoved = dragState.hasMoved || movement > 5;
  const nextPanX = dragState.panX + ((event.clientX - dragState.startX) / bounds.width) * 100;
  const nextPanY = dragState.panY + ((event.clientY - dragState.startY) / bounds.height) * 100;
  const panLimit = getPreviewPanLimit();
  previewPanX = clamp(nextPanX, -panLimit, panLimit);
  previewPanY = clamp(nextPanY, -panLimit, panLimit);
  updatePreviewTransform();
});

const stopPreviewDrag = (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const shouldReplacePhoto = event.type === 'pointerup' && !dragState.hasMoved;
  dragState = null;
  photoFrame.classList.remove('is-dragging');
  if (photoFrame.hasPointerCapture(event.pointerId)) {
    photoFrame.releasePointerCapture(event.pointerId);
  }

  if (shouldReplacePhoto) {
    photoInput.click();
  }
};

photoFrame.addEventListener('pointerup', stopPreviewDrag);
photoFrame.addEventListener('pointercancel', stopPreviewDrag);

resetButton.addEventListener('click', resetState);
downloadDigitalButton.addEventListener('click', downloadDigitalPhoto);
downloadPrintButton.addEventListener('click', downloadPrintableSheet);
printOrderForm.addEventListener('submit', submitPrintOrder);

cameraButton.addEventListener('click', () => {
  openCameraModal();
});

phoneUploadButton.addEventListener('click', openPhoneUploadModal);
phoneUploadClose.addEventListener('click', closePhoneUploadModal);
phoneUploadModal.addEventListener('click', (event) => {
  if (event.target === phoneUploadModal) {
    closePhoneUploadModal();
  }
});

cameraClose.addEventListener('click', closeCameraModal);
cancelCameraButton.addEventListener('click', closeCameraModal);
flipCameraButton.addEventListener('click', flipCamera);
captureCameraButton.addEventListener('click', captureCameraPhoto);
cameraModal.addEventListener('click', (event) => {
  if (event.target === cameraModal) {
    closeCameraModal();
  }
});

variantCards.forEach((card) => {
  card.addEventListener('click', () => selectVariant(card.dataset.variant));
});

updateRequirementSummary();
resetState();
