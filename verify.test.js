const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('page contains the approved SnapPass product shell', () => {
  const html = read('index.html');
  assert.match(html, /SnapPass/);
  assert.match(html, /Passport photos that pass the first time/);
  assert.match(html, /id="country"/);
  assert.match(html, /id="documentType"/);
  assert.match(html, /id="photoInput"/);
  assert.match(html, /id="exportPanel"/);
});

test('stylesheet defines the approved visual system and responsive layout', () => {
  const css = read('styles.css');
  assert.match(css, /--color-primary:\s*#167f63/);
  assert.match(css, /--color-ink:\s*#10251f/);
  assert.match(css, /\.hero-grid/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});

test('script wires upload preview and export state behavior', () => {
  const js = read('app.js');
  assert.match(js, /photoInput\.addEventListener\('change'/);
  assert.match(js, /URL\.createObjectURL/);
  assert.match(js, /exportPanel\.hidden\s*=\s*false/);
  assert.match(js, /resetButton\.addEventListener\('click'/);
});

test('deployment package supports Render, Railway, and Vercel', () => {
  const packageJson = JSON.parse(read('package.json'));
  const server = read('server.js');
  const renderYaml = read('render.yaml');
  const vercelJson = JSON.parse(read('vercel.json'));

  assert.equal(packageJson.scripts.start, 'node server.js');
  assert.equal(packageJson.scripts.test, 'node --test verify.test.js');
  assert.match(server, /process\.env\.PORT/);
  assert.match(renderYaml, /type:\s*web/);
  assert.match(renderYaml, /startCommand:\s*npm start/);
  assert.equal(vercelJson.cleanUrls, true);
});
