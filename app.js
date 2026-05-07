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
    item.classList.remove('is-pending', 'is-pass', 'is-warning');
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
};

const showLoadedState = (file) => {
  photoPreview.src = URL.createObjectURL(file);
  photoPreview.alt = `Preview of ${file.name}`;
  photoFrame.classList.add('has-photo');
  adjustmentPanel.hidden = false;
  exportPanel.hidden = false;
  statusPill.textContent = 'Review lighting';
  statusPill.classList.add('is-warning');
  setChecklist('loaded');
  updatePreviewTransform();
};

const resetState = () => {
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  photoPreview.alt = '';
  photoFrame.classList.remove('has-photo');
  adjustmentPanel.hidden = true;
  exportPanel.hidden = true;
  zoomRange.value = '100';
  rotateRange.value = '0';
  statusPill.textContent = 'Ready';
  statusPill.classList.remove('is-warning');
  setChecklist('ready');
  updatePreviewTransform();
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

resetButton.addEventListener('click', resetState);

cameraButton.addEventListener('click', () => {
  photoInput.click();
});

updateRequirementSummary();
resetState();
