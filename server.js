const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const root = __dirname;
const openAiApiKey = process.env.OPENAI_API_KEY || '';
const openAiModel = process.env.OPENAI_MODEL || 'gpt-5.5';
const openAiImageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const walgreensApiKey = process.env.WALGREENS_API_KEY || '';
const walgreensOrderEndpoint = process.env.WALGREENS_ORDER_ENDPOINT || '';
const walgreensAffiliateId = process.env.WALGREENS_AFFILIATE_ID || '';
const walgreensProductId = process.env.WALGREENS_4X6_PRODUCT_ID || '4x6-print';
const walgreensEnvironment = process.env.WALGREENS_ENVIRONMENT || 'sandbox';
const walgreensCredsEndpoint = process.env.WALGREENS_CREDS_ENDPOINT || (
  walgreensEnvironment === 'production'
    ? 'https://services.walgreens.com/api/photo/creds/v3'
    : 'https://services-qa.walgreens.com/api/photo/creds/v3'
);
const walgreensPlatform = process.env.WALGREENS_PLATFORM || 'web';
const walgreensTransaction = process.env.WALGREENS_TRANSACTION || 'photocheckoutv2';
const walgreensAppVersion = process.env.WALGREENS_APP_VERSION || '1.0';
const walgreensDeviceInfo = process.env.WALGREENS_DEVICE_INFO || 'WEB,1.0';
const supportAlertWebhookUrl = process.env.SUPPORT_ALERT_WEBHOOK_URL || '';
const supportAlertEmail = process.env.SUPPORT_ALERT_EMAIL || '';
const maxJsonBytes = 12 * 1024 * 1024;
const mobileUploads = new Map();
const printOrders = new Map();
const supportAlerts = [];
const specRoot = path.join(root, 'docs', 'photo-specs');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const send = (response, status, body, contentType = 'text/plain; charset=utf-8') => {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store'
  });
  response.end(body);
};

const sendJson = (response, status, data) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(data));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';

  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > maxJsonBytes) {
      reject(new Error('Payload too large'));
      request.destroy();
    }
  });

  request.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });

  request.on('error', reject);
});

const makeAlertId = () => `photo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const summarizeError = (error) => {
  const message = typeof error === 'string' ? error : error?.message || 'Unknown AI provider error';
  return message.replace(/\s+/g, ' ').slice(0, 220);
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const redactSecretText = (value) => {
  let text = String(value || '')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-openai-key]')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '[redacted-github-token]');

  if (openAiApiKey) {
    text = text.replace(new RegExp(escapeRegExp(openAiApiKey), 'g'), '[redacted-openai-key]');
  }
  if (walgreensApiKey) {
    text = text.replace(new RegExp(escapeRegExp(walgreensApiKey), 'g'), '[redacted-walgreens-key]');
  }

  return text;
};

const sanitizeAlertDetails = (details = {}) => {
  const variantErrors = details.variantErrors && typeof details.variantErrors === 'object'
    ? Object.fromEntries(Object.entries(details.variantErrors).map(([key, value]) => [key, summarizeError(redactSecretText(value))]))
    : undefined;
  const message = details.error || details.message || (variantErrors ? Object.values(variantErrors).filter(Boolean).join(' | ') : '');

  return {
    message: summarizeError(redactSecretText(message)),
    variantErrors,
    status: details.status || undefined
  };
};

const recordSupportAlert = (type, details = {}) => {
  const alert = {
    id: makeAlertId(),
    type,
    createdAt: new Date().toISOString(),
    supportEmail: supportAlertEmail || null,
    details
  };

  supportAlerts.unshift(alert);
  supportAlerts.splice(25);
  console.warn('[SnapPass support alert]', JSON.stringify(alert));

  if (supportAlertWebhookUrl) {
    fetch(supportAlertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    }).catch((error) => {
      console.warn('[SnapPass support alert webhook failed]', summarizeError(error));
    });
  }

  return alert.id;
};

const fallbackAnalysis = ({ filename = '' } = {}) => {
  const name = filename.toLowerCase();
  const isLikelyNotHuman = /object|pet|car|logo|document|landscape|room|food/.test(name);
  const hasLightingIssue = /dark|shadow|glare|dim|bright/.test(name);
  const hasHeadIssue = /offcenter|off-center|side|tilt|far/.test(name);
  const hasBackgroundIssue = /busy|background|object|room|pattern/.test(name);
  const hasEyeClarityIssue = /blur|blurry|soft|unclear|out-of-focus|outoffocus|eyes-closed|closed-eye/.test(name);
  const retakeRequired = isLikelyNotHuman || hasEyeClarityIssue;

  return {
    mode: 'server fallback',
    isHuman: !isLikelyNotHuman,
    eyeClarity: hasEyeClarityIssue ? 'warning' : 'pass',
    lighting: hasLightingIssue ? 'warning' : 'pass',
    headCentered: hasHeadIssue ? 'warning' : 'pass',
    background: hasBackgroundIssue ? 'warning' : 'pass',
    retakeRequired,
    enhancementAllowed: !retakeRequired,
    recommendedZoom: 100,
    recommendedRotation: 0,
    warnings: [
      isLikelyNotHuman ? 'No clear human passport portrait detected.' : null,
      hasEyeClarityIssue ? 'Eyes or facial features are blurred or unclear. Upload a sharper front-facing photo; do not use AI enhancement.' : null,
      hasLightingIssue ? 'Lighting may be uneven. Retake in soft front light.' : null,
      hasHeadIssue ? 'Head may be off center. Apply the suggested crop or retake straight-on.' : null,
      hasBackgroundIssue ? 'Background may contain clutter. Use white replacement or AI cleanup.' : null
    ].filter(Boolean),
    checks: {
      human: isLikelyNotHuman
        ? 'No clear human portrait detected in fallback checks.'
        : 'Looks like a single front-facing portrait.',
      eyeClarity: hasEyeClarityIssue
        ? 'Eyes or facial features are not sharp enough. Retake with a clearer photo.'
        : 'Eyes and facial features appear clear enough for review.',
      lighting: hasLightingIssue
        ? 'Lighting may be uneven. Retake in soft front light with no shadows.'
        : 'Lighting appears even enough for preview.',
      head: hasHeadIssue
        ? 'Head may be tilted or off center. Use zoom/rotate or retake straight-on.'
        : 'Head appears centered inside the guide.',
      background: hasBackgroundIssue
        ? 'Background may contain objects or texture. Use cleanup or a plain wall.'
        : 'Background appears plain for preview.'
    }
  };
};

const hasRetakeOnlyIssue = (analysis = {}) => {
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
    humanAndFaceItems.some((item) => (
      /no clear human|not a human|not human|does not appear to be a human|human.*not detected|multiple faces|more than one face|not front-facing|side profile/i.test(item) ||
      /eyes?.*(blur|blurry|unclear|closed|obscured|out of focus|not sharp|not clear)/i.test(item) ||
      /(blur|blurry|unclear|obscured|out of focus|not sharp|not clear).*eyes?/i.test(item) ||
      /facial features?.*(blur|blurry|unclear|obscured|out of focus|not sharp|not clear)/i.test(item) ||
      /(blur|blurry|unclear|obscured|out of focus|not sharp|not clear).*facial features?/i.test(item)
    ))
  );
};

const shouldRequireRetake = (analysis = {}) => hasRetakeOnlyIssue(analysis);

const normalizeAnalysisForEditing = (analysis = {}) => {
  const retakeRequired = shouldRequireRetake(analysis);
  return {
    ...analysis,
    retakeRequired,
    enhancementAllowed: !retakeRequired
  };
};

const getOutputText = (data) => {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  const message = data.output?.find((item) => item.type === 'message');
  const textPart = message?.content?.find((item) => item.type === 'output_text');
  return textPart?.text || '';
};

const parseJsonOutput = (text) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};

const readSpecMarkdown = (country = 'us', documentType = 'passport') => {
  const safeCountry = String(country || 'us').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const safeDocument = String(documentType || 'passport').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const candidates = [
    path.join(specRoot, `${safeCountry}-${safeDocument}.md`),
    path.join(specRoot, `${safeCountry}-passport.md`),
    path.join(specRoot, 'us-passport.md')
  ];

  for (const candidate of candidates) {
    try {
      return fs.readFileSync(candidate, 'utf8');
    } catch {
      // Try the next most specific spec file.
    }
  }

  return [
    '# Passport Photo Spec',
    '- Square output.',
    '- One front-facing human subject.',
    '- Plain white or off-white background.',
    '- Preserve facial features and identity.'
  ].join('\n');
};

const handleSpec = (response, searchParams) => {
  const country = searchParams.get('country') || 'us';
  const documentType = searchParams.get('documentType') || 'passport';
  sendJson(response, 200, {
    country,
    documentType,
    markdown: readSpecMarkdown(country, documentType)
  });
};

const handleAgentStatus = (response) => {
  const specFiles = fs.readdirSync(specRoot).filter((file) => file.endsWith('.md'));
  sendJson(response, 200, {
    status: openAiApiKey ? 'ready' : 'fallback',
    aiConfigured: Boolean(openAiApiKey),
    analysisModel: openAiModel,
    imageModel: openAiImageModel,
    renderCommit: process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || null,
    supportAlertsConfigured: Boolean(supportAlertWebhookUrl || supportAlertEmail),
    recentAlerts: supportAlerts.slice(0, 5).map((alert) => {
      const safeDetails = sanitizeAlertDetails(alert.details);
      return {
        id: alert.id,
        type: alert.type,
        createdAt: alert.createdAt,
        message: safeDetails.message,
        variantErrors: safeDetails.variantErrors
      };
    }),
    specCount: specFiles.length,
    endpoints: [
      '/api/photo/analyze',
      '/api/photo/suggest',
      '/api/photo/background',
      '/api/photo/spec'
    ]
  });
};

const makeOrderId = () => `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getPublicOrigin = (request) => {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';
  const hostHeader = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
  const hostName = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${hostName}`;
};

const providerList = () => ([
  {
    id: 'walgreens',
    name: 'Walgreens',
    status: walgreensApiKey && walgreensAffiliateId
      ? (walgreensOrderEndpoint ? 'configured' : 'sandbox-upload-ready')
      : 'credentials-needed',
    product: '4x6 photo print',
    pickup: 'Same-day pickup when the store supports the selected product.',
    notes: [
      'Requires approved Walgreens Photo Prints API access.',
      'SnapPass fetches sandbox upload credentials server-side and uploads the final printable 4x6 sheet.',
      'A full approved order endpoint is required before real pickup checkout submission.'
    ],
    requiredEnv: [
      'WALGREENS_API_KEY',
      'WALGREENS_ENVIRONMENT',
      'WALGREENS_CREDS_ENDPOINT',
      'WALGREENS_AFFILIATE_ID',
      'WALGREENS_ORDER_ENDPOINT',
      'WALGREENS_4X6_PRODUCT_ID'
    ]
  }
]);

const handlePrintProviders = (request, response) => {
  const parsedUrl = new URL(request.url || '/', getPublicOrigin(request));
  const zip = parsedUrl.searchParams.get('zip') || '';
  sendJson(response, 200, {
    providers: providerList(),
    zip,
    message: zip
      ? 'Walgreens pickup is first in the provider queue. Store search activates after provider credentials are configured.'
      : 'Enter a ZIP code to prepare a Walgreens pickup handoff.'
  });
};

const parseDataUrl = (dataUrl = '') => {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('image.dataUrl must be a base64 data URL');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
};

const fetchWalgreensUploadCredentials = async () => {
  if (!walgreensApiKey || !walgreensAffiliateId) {
    throw new Error('WALGREENS_API_KEY and WALGREENS_AFFILIATE_ID are required for Walgreens upload credentials.');
  }

  const response = await fetch(walgreensCredsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: walgreensApiKey,
      affId: walgreensAffiliateId,
      platform: walgreensPlatform,
      transaction: walgreensTransaction,
      appVer: walgreensAppVersion,
      devInf: walgreensDeviceInfo
    })
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Walgreens upload credentials failed: ${response.status}`);
  }

  const sasKeyToken = data?.cloud?.[0]?.sasKeyToken;
  if (!sasKeyToken) {
    throw new Error('Walgreens upload credentials did not include cloud[0].sasKeyToken.');
  }

  return {
    uploadLimit: data.uploadLimit,
    template: data.template,
    landingUrl: data.landingUrl,
    sasKeyToken
  };
};

const buildWalgreensUploadUrl = (sasKeyToken, filename) => {
  const url = new URL(sasKeyToken);
  const cleanName = filename.replace(/[^a-z0-9._-]/gi, '-');
  if (!path.extname(url.pathname)) {
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${cleanName}`;
  }
  return url.toString();
};

const uploadImageToWalgreensStorage = async ({ orderId, image }) => {
  const credentials = await fetchWalgreensUploadCredentials();
  const { mimeType, buffer } = parseDataUrl(image.dataUrl);
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const uploadUrl = buildWalgreensUploadUrl(credentials.sasKeyToken, `${orderId}.${extension}`);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
      'x-ms-blob-type': 'BlockBlob'
    },
    body: buffer
  });

  if (!response.ok) {
    throw new Error(`Walgreens image upload failed: ${response.status}`);
  }

  return {
    uploadUrl,
    landingUrl: credentials.landingUrl,
    uploadLimit: credentials.uploadLimit
  };
};

const buildWalgreensOrderPayload = ({ orderId, body }) => ({
  partnerOrderId: orderId,
  affiliateId: walgreensAffiliateId || undefined,
  provider: 'walgreens',
  customer: body.customer,
  store: {
    id: body.storeId || body.store?.id || '',
    zip: body.zip || body.store?.zip || ''
  },
  products: [
    {
      productId: body.product?.id || walgreensProductId,
      type: body.product?.type || '4x6',
      quantity: Number(body.product?.quantity || 1),
      imageUrl: body.image?.url
    }
  ],
  metadata: {
    source: 'snappass',
    imageKind: body.image?.kind || 'passport_sheet_4x6'
  }
});

const submitWalgreensOrder = async ({ orderId, body }) => {
  const providerPayload = buildWalgreensOrderPayload({ orderId, body });
  const response = await fetch(walgreensOrderEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${walgreensApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(providerPayload)
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Walgreens order failed: ${response.status}`);
  }

  return {
    providerOrderId: data?.orderId || data?.id || data?.providerOrderId || orderId,
    providerResponse: data
  };
};

const handlePrintOrder = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const provider = body.provider || 'walgreens';
    if (provider !== 'walgreens') {
      sendJson(response, 400, { error: 'Only Walgreens is supported in the first provider integration.' });
      return;
    }

    if (!body.customer?.email && !body.customer?.phone) {
      sendJson(response, 400, { error: 'customer.email or customer.phone is required for print pickup.' });
      return;
    }

    if (!body.zip && !body.storeId && !body.store?.id) {
      sendJson(response, 400, { error: 'zip or storeId is required for Walgreens pickup.' });
      return;
    }

    const orderId = makeOrderId();
    const createdAt = new Date().toISOString();
    const order = {
      orderId,
      provider,
      status: 'pending_provider_credentials',
      createdAt,
      zip: body.zip || body.store?.zip || '',
      storeId: body.storeId || body.store?.id || '',
      customer: {
        email: body.customer?.email || '',
        phone: body.customer?.phone || ''
      },
      product: {
        type: body.product?.type || '4x6',
        quantity: Number(body.product?.quantity || 1)
      }
    };

    if (!walgreensApiKey || !walgreensAffiliateId) {
      printOrders.set(orderId, order);
      sendJson(response, 202, {
        ...order,
        message: 'Walgreens order intent saved. Add Walgreens API key and affiliate id to fetch sandbox upload credentials.',
        nextStep: 'Configure WALGREENS_API_KEY and WALGREENS_AFFILIATE_ID on the server.'
      });
      return;
    }

    let providerImage = body.image || {};
    if (!providerImage.url && providerImage.dataUrl) {
      try {
        const uploadResult = await uploadImageToWalgreensStorage({ orderId, image: providerImage });
        providerImage = {
          ...providerImage,
          url: uploadResult.uploadUrl
        };
        order.walgreensUpload = {
          status: 'uploaded',
          landingUrl: uploadResult.landingUrl,
          uploadLimit: uploadResult.uploadLimit
        };
      } catch (error) {
        const alertId = recordSupportAlert('walgreens_image_upload_failed', {
          orderId,
          error: summarizeError(error)
        });
        order.status = 'pending_walgreens_upload';
        order.alertId = alertId;
        printOrders.set(orderId, order);
        sendJson(response, 202, {
          ...order,
          message: `Walgreens sandbox upload failed before checkout handoff. Support alert ${alertId} recorded.`,
          nextStep: 'Verify WALGREENS_API_KEY, WALGREENS_AFFILIATE_ID, and sandbox credentials access.'
        });
        return;
      }
    }

    if (!providerImage.url) {
      order.status = 'pending_public_image_url';
      printOrders.set(orderId, order);
      sendJson(response, 202, {
        ...order,
        message: 'Walgreens sandbox credentials are configured, but submission needs a generated 4x6 image data URL or public image URL.',
        nextStep: 'Send image.dataUrl from the generated 4x6 sheet or provide image.url for provider pickup.'
      });
      return;
    }

    const orderBody = {
      ...body,
      image: providerImage
    };

    if (!walgreensOrderEndpoint) {
      order.status = 'pending_walgreens_checkout';
      printOrders.set(orderId, order);
      sendJson(response, 202, {
        ...order,
        message: 'Walgreens sandbox upload is ready. Add the approved Walgreens order endpoint to submit pickup checkout.',
        nextStep: 'Configure WALGREENS_ORDER_ENDPOINT after Walgreens approves the order submission contract.'
      });
      return;
    }

    const providerResult = await submitWalgreensOrder({ orderId, body: orderBody });
    order.status = 'submitted';
    order.providerOrderId = providerResult.providerOrderId;
    printOrders.set(orderId, order);
    sendJson(response, 200, {
      ...order,
      message: 'Walgreens print order submitted.',
      providerResponse: providerResult.providerResponse
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message,
      message: 'Walgreens print handoff failed before completion.'
    });
  }
};

const analyzeWithOpenAi = async ({ imageDataUrl, country, documentType }) => {
  const specMarkdown = readSpecMarkdown(country, documentType);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a passport photo compliance agent. Inspect the image only for photo quality and official-document fit. Do not identify the person.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `Document target: ${country || 'us'} ${documentType || 'passport'}.`,
                `Official/local spec markdown:\n${specMarkdown}`,
                'Return strict JSON with keys: isHuman boolean, eyeClarity pass|warning, lighting pass|warning, headCentered pass|warning, background pass|warning, retakeRequired boolean, enhancementAllowed boolean, recommendedZoom number 80-140, recommendedRotation number -8 to 8, warnings string[], checks object with human eyeClarity lighting head background strings.',
                'Check whether the subject is human, front-facing, evenly lit, centered, and on an acceptable plain white or off-white passport background.',
                'If the eyes are blurred, closed, obscured, out of focus, or facial features are not clearly visible, set eyeClarity warning, retakeRequired true, enhancementAllowed false, and explain that the user must upload a new sharper photo.',
                'Do not suggest AI repair for blurred eyes or unclear facial features.'
              ].join(' ')
            },
            {
              type: 'input_image',
              image_url: imageDataUrl
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const outputText = getOutputText(data);
  return parseJsonOutput(outputText);
};

const dataUrlToBlob = async (dataUrl) => {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const bytes = Buffer.from(encoded || '', 'base64');
  return new Blob([bytes], { type: mime });
};

const describeOpenAiError = (status, text) => {
  const lower = text.toLowerCase();
  const category = status === 429 || /quota|rate limit|billing|insufficient_quota/.test(lower)
    ? 'quota or rate limit'
    : status >= 500
      ? 'provider server error'
      : 'provider request error';
  return `OpenAI image edit failed: ${status} ${category}. ${text.replace(/\s+/g, ' ').slice(0, 180)}`;
};

const editBackgroundWithOpenAi = async ({ imageDataUrl, mode, country, documentType }) => {
  const form = new FormData();
  const imageBlob = await dataUrlToBlob(imageDataUrl);
  const specMarkdown = readSpecMarkdown(country, documentType);
  const promptByMode = {
    'ai-cleanup': [
      'Create a recommended passport-photo background for this selected document spec.',
      'Remove background objects, texture, room details, and shadows.',
      'Choose the safest compliant background tone for the spec, usually smooth white or off-white, and keep it natural.',
      'Apply only gentle global lighting and contrast balancing if needed.'
    ].join(' '),
    'replace-white': [
      'Change only the background to clean pure white for a passport photo.',
      'Do not apply beauty retouching, lighting enhancement, contrast changes, clothing edits, crop changes, or any other adjustment.',
      'This is a strict background-only edit.'
    ].join(' ')
  };
  form.append('model', openAiImageModel);
  form.append('image', imageBlob, 'passport-source.png');
  form.append('size', '1024x1024');
  form.append('prompt', [
    promptByMode[mode] || promptByMode['ai-cleanup'],
    `Follow this spec:\n${specMarkdown}`,
    'Do not change facial features, identity, skin texture, hairline, expression, head shape, eye shape, nose, mouth, clothing, pose, or facial geometry.',
    'If eyes or facial features are blurry or unclear, do not invent or sharpen facial details. Leave the face unchanged.'
  ].join(' '));

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(describeOpenAiError(response.status, text));
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI background edit did not return image data');
  }

  return `data:image/png;base64,${b64}`;
};

const handleAnalyze = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    if (!body.imageDataUrl) {
      sendJson(response, 400, { error: 'imageDataUrl is required' });
      return;
    }

    if (!openAiApiKey) {
      sendJson(response, 200, fallbackAnalysis(body));
      return;
    }

    const analysis = normalizeAnalysisForEditing({ ...fallbackAnalysis(body), ...(await analyzeWithOpenAi(body)) });
    sendJson(response, 200, { mode: 'openai', ...analysis });
  } catch (error) {
    sendJson(response, 200, {
      ...fallbackAnalysis({}),
      mode: 'server fallback',
      warnings: [`AI analysis unavailable: ${error.message}`]
    });
  }
};

const handleBackground = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    if (!body.imageDataUrl) {
      sendJson(response, 400, { error: 'imageDataUrl is required' });
      return;
    }

    if (!openAiApiKey) {
      sendJson(response, 200, {
        mode: 'server fallback',
        imageDataUrl: null,
        message: 'AI background editing is not configured on this server yet. SnapPass kept the selected photo unchanged.'
      });
      return;
    }

    const analysis = normalizeAnalysisForEditing(await analyzeWithOpenAi(body));
    if (shouldRequireRetake(analysis)) {
      sendJson(response, 200, {
        mode: 'openai',
        imageDataUrl: null,
        analysis,
        message: 'Retake recommended: eyes or facial features are not clear enough for AI cleanup. Upload a sharper front-facing photo.'
      });
      return;
    }

    const imageDataUrl = await editBackgroundWithOpenAi(body);
    sendJson(response, 200, {
      mode: 'openai',
      imageDataUrl,
      message: 'AI background cleanup applied without intentional facial changes.'
    });
  } catch (error) {
    const alertId = recordSupportAlert('photo_background_edit_failed', {
      error: summarizeError(error)
    });
    sendJson(response, 200, {
      mode: 'server fallback',
      imageDataUrl: null,
      alertId,
      message: `AI cleanup is temporarily unavailable, so SnapPass kept the selected photo unchanged. Support alert ${alertId} recorded.`
    });
  }
};

const handleSuggest = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    if (!body.imageDataUrl) {
      sendJson(response, 400, { error: 'imageDataUrl is required' });
      return;
    }

    const baseAnalysis = fallbackAnalysis(body);
    if (!openAiApiKey) {
      const fallbackRetakeRequired = shouldRequireRetake(baseAnalysis);
      sendJson(response, 200, {
        mode: 'server fallback',
        analysis: baseAnalysis,
        variants: {
          aiSuggestedDataUrl: null,
          whiteBackgroundDataUrl: null,
          lightingDataUrl: null
        },
        message: fallbackRetakeRequired
          ? 'Retake recommended: upload a clear front-facing human passport photo before using AI suggestions.'
          : 'AI suggestions are not configured on this server yet. Original photo remains selected and a lighting preview is available.'
      });
      return;
    }

    const analysis = await analyzeWithOpenAi(body);
    const mergedAnalysis = normalizeAnalysisForEditing({ ...baseAnalysis, ...analysis });
    if (shouldRequireRetake(mergedAnalysis)) {
      sendJson(response, 200, {
        mode: 'openai',
        analysis: {
          ...mergedAnalysis,
          retakeRequired: true,
          enhancementAllowed: false
        },
        variants: {
          aiSuggestedDataUrl: null,
          whiteBackgroundDataUrl: null,
          lightingDataUrl: null
        },
        message: 'Retake recommended: eyes or facial features are not clear enough. Upload a sharper front-facing photo; SnapPass will not use AI to invent or change facial details.'
      });
      return;
    }

    const variantErrors = {};
    const runEdit = async (mode, key) => {
      try {
        return await editBackgroundWithOpenAi({ ...body, mode });
      } catch (error) {
        variantErrors[key] = summarizeError(error);
        return null;
      }
    };
    const [aiSuggestedDataUrl, whiteBackgroundDataUrl] = await Promise.all([
      runEdit('ai-cleanup', 'aiSuggested'),
      runEdit('replace-white', 'whiteBackground')
    ]);
    const alertId = Object.keys(variantErrors).length
      ? recordSupportAlert('photo_variant_generation_failed', {
        country: body.country || 'us',
        documentType: body.documentType || 'passport',
        variantErrors
      })
      : null;

    sendJson(response, 200, {
      mode: 'openai',
      analysis: mergedAnalysis,
      variants: {
        aiSuggestedDataUrl,
        whiteBackgroundDataUrl,
        lightingDataUrl: null
      },
      variantErrors,
      alertId,
      message: aiSuggestedDataUrl || whiteBackgroundDataUrl
        ? 'AI suggested and white-background variants are ready. AI suggested uses a recommended compliant background; white background is a strict background-only edit.'
        : `AI analysis is ready. Background editing failed; support alert ${alertId} recorded.`
    });
  } catch (error) {
    const alertId = recordSupportAlert('photo_suggestion_failed', {
      error: summarizeError(error)
    });
    sendJson(response, 200, {
      mode: 'server fallback',
      analysis: {
        ...fallbackAnalysis({}),
        warnings: [`AI suggestion unavailable: ${error.message}`]
      },
      variants: {
        aiSuggestedDataUrl: null,
        whiteBackgroundDataUrl: null,
        lightingDataUrl: null
      },
      variantErrors: {
        aiSuggested: summarizeError(error),
        whiteBackground: summarizeError(error)
      },
      alertId,
      message: `AI suggestion unavailable: ${summarizeError(error)}. Support alert ${alertId} recorded.`
    });
  }
};

const readMobileSession = (url = '') => {
  const match = url.match(/^\/api\/mobile-upload\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const handleMobileUploadPost = async (request, response, session) => {
  try {
    const body = await readJsonBody(request);
    if (!session || !body.imageDataUrl) {
      sendJson(response, 400, { error: 'session and imageDataUrl are required' });
      return;
    }

    mobileUploads.set(session, {
      filename: body.filename || 'phone-upload.png',
      imageDataUrl: body.imageDataUrl,
      createdAt: Date.now()
    });

    sendJson(response, 200, { status: 'ready' });
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
};

const handleMobileUploadGet = (response, session) => {
  const upload = mobileUploads.get(session);
  if (!upload) {
    sendJson(response, 200, { status: 'waiting' });
    return;
  }

  mobileUploads.delete(session);
  sendJson(response, 200, {
    status: 'ready',
    filename: upload.filename,
    imageDataUrl: upload.imageDataUrl
  });
};

const resolvePath = (urlPath) => {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
};

const server = http.createServer(async (request, response) => {
  const parsedUrl = new URL(request.url || '/', 'http://localhost');
  const mobileSession = readMobileSession(request.url || '');
  if (mobileSession && request.method === 'POST') {
    await handleMobileUploadPost(request, response, mobileSession);
    return;
  }

  if (mobileSession && request.method === 'GET') {
    handleMobileUploadGet(response, mobileSession);
    return;
  }

  if (request.method === 'GET' && parsedUrl.pathname === '/api/photo/spec') {
    handleSpec(response, parsedUrl.searchParams);
    return;
  }

  if (request.method === 'GET' && parsedUrl.pathname === '/api/photo/agent-status') {
    handleAgentStatus(response);
    return;
  }

  if (request.method === 'POST' && parsedUrl.pathname === '/api/photo/analyze') {
    await handleAnalyze(request, response);
    return;
  }

  if (request.method === 'POST' && parsedUrl.pathname === '/api/photo/suggest') {
    await handleSuggest(request, response);
    return;
  }

  if (request.method === 'POST' && parsedUrl.pathname === '/api/photo/background') {
    await handleBackground(request, response);
    return;
  }

  if (request.method === 'GET' && parsedUrl.pathname === '/api/print/providers') {
    handlePrintProviders(request, response);
    return;
  }

  if (request.method === 'POST' && parsedUrl.pathname === '/api/print/orders') {
    await handlePrintOrder(request, response);
    return;
  }

  const filePath = resolvePath(request.url || '/');

  if (!filePath) {
    send(response, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(root, 'index.html'), (fallbackError, fallbackData) => {
          if (fallbackError) {
            send(response, 404, 'Not found');
            return;
          }
          send(response, 200, fallbackData, mimeTypes['.html']);
        });
        return;
      }

      send(response, 500, 'Server error');
      return;
    }

    send(response, 200, data, mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(port, host, () => {
  console.log(`SnapPass running on ${host}:${port}`);
});
