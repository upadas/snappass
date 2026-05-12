const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const root = __dirname;
const openAiApiKey = process.env.OPENAI_API_KEY || '';
const openAiModel = process.env.OPENAI_MODEL || 'gpt-5.5';
const openAiImageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const maxJsonBytes = 12 * 1024 * 1024;
const mobileUploads = new Map();
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

const fallbackAnalysis = ({ filename = '' } = {}) => {
  const name = filename.toLowerCase();
  const isLikelyNotHuman = /object|pet|car|logo|document|landscape|room|food/.test(name);
  const hasLightingIssue = /dark|shadow|glare|dim|bright/.test(name);
  const hasHeadIssue = /offcenter|off-center|side|tilt|far/.test(name);
  const hasBackgroundIssue = /busy|background|object|room|pattern/.test(name);

  return {
    mode: 'server fallback',
    isHuman: !isLikelyNotHuman,
    lighting: hasLightingIssue ? 'warning' : 'pass',
    headCentered: hasHeadIssue ? 'warning' : 'pass',
    background: hasBackgroundIssue ? 'warning' : 'pass',
    recommendedZoom: 100,
    recommendedRotation: 0,
    warnings: [
      isLikelyNotHuman ? 'No clear human passport portrait detected.' : null,
      hasLightingIssue ? 'Lighting may be uneven. Retake in soft front light.' : null,
      hasHeadIssue ? 'Head may be off center. Apply the suggested crop or retake straight-on.' : null,
      hasBackgroundIssue ? 'Background may contain clutter. Use white replacement or AI cleanup.' : null
    ].filter(Boolean),
    checks: {
      human: isLikelyNotHuman
        ? 'No clear human portrait detected in fallback checks.'
        : 'Looks like a single front-facing portrait.',
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
                'Return strict JSON with keys: isHuman boolean, lighting pass|warning, headCentered pass|warning, background pass|warning, recommendedZoom number 80-140, recommendedRotation number -8 to 8, warnings string[], checks object with human lighting head background strings.',
                'Check whether the subject is human, front-facing, evenly lit, centered, and on an acceptable plain white or off-white passport background.'
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

const editBackgroundWithOpenAi = async ({ imageDataUrl, mode, country, documentType }) => {
  const form = new FormData();
  const imageBlob = await dataUrlToBlob(imageDataUrl);
  const specMarkdown = readSpecMarkdown(country, documentType);
  form.append('model', openAiImageModel);
  form.append('image', imageBlob, 'passport-source.png');
  form.append('size', '1024x1024');
  form.append('prompt', [
    mode === 'ai-cleanup'
      ? 'Remove background objects and replace the backdrop with a smooth plain white or off-white passport-photo background.'
      : 'Replace the full background with clean pure white for a passport photo.',
    `Follow this spec:\n${specMarkdown}`,
    'Do not change facial features, identity, skin texture, hairline, expression, head shape, clothing, pose, or facial geometry.'
  ].join(' '));

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`OpenAI background edit failed: ${response.status}`);
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

    const analysis = await analyzeWithOpenAi(body);
    sendJson(response, 200, { mode: 'openai', ...fallbackAnalysis(body), ...analysis });
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
        message: 'Set the server API key to run real AI background replacement. SnapPass keeps the photo intact instead of applying a destructive mask.'
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
    sendJson(response, 200, {
      mode: 'server fallback',
      imageDataUrl: null,
      message: `AI cleanup failed, so SnapPass kept the photo intact instead of applying a destructive mask: ${error.message}`
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
      sendJson(response, 200, {
        mode: 'server fallback',
        analysis: baseAnalysis,
        variants: {
          aiSuggestedDataUrl: null,
          whiteBackgroundDataUrl: null,
          lightingDataUrl: null
        },
        message: 'AI suggested photo needs OPENAI_API_KEY. Original photo remains selected; local lighting preview is available.'
      });
      return;
    }

    const analysis = await analyzeWithOpenAi(body);
    let whiteBackgroundDataUrl = null;
    try {
      whiteBackgroundDataUrl = await editBackgroundWithOpenAi({ ...body, mode: 'replace-white' });
    } catch {
      whiteBackgroundDataUrl = null;
    }

    sendJson(response, 200, {
      mode: 'openai',
      analysis: { ...baseAnalysis, ...analysis },
      variants: {
        aiSuggestedDataUrl: whiteBackgroundDataUrl,
        whiteBackgroundDataUrl,
        lightingDataUrl: null
      },
      message: whiteBackgroundDataUrl
        ? 'AI suggested and white-background variants are ready. Choose the version you prefer.'
        : 'AI analysis is ready. Background editing was unavailable, so the original remains selected.'
    });
  } catch (error) {
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
      message: `AI suggestion unavailable: ${error.message}`
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
