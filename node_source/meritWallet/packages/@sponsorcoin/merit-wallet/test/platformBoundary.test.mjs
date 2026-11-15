// File: test/platformBoundary.test.mjs
//
// 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.3 and 8.5.7 item 2) -- the boundary of the wallet component. The component is ONE standard component and everything that differs between deployments is injected (polymorphism by injection, 8.5.8), so
// inside src/ there must be no reach for the device and no branch on the deployment:
//   - no `chrome.`, localStorage, sessionStorage, window, document or navigator, EXCEPT in the allowed adapters below (the platform folder, the device transports, the IndexedDB adapter), which are the injected parts themselves;
//   - no branch on the deployment (isExtension, appType === ..., APP_TYPE.EXTENSION).
// The remaining DOM-layout files (the avatar editor and its canvas helpers: they measure the page and draw to a canvas) are a BASELINE in test/platformBoundaryBaseline.json: their counts may only go down. A new use anywhere, or a higher count, fails this test.
// Run: node test/platformBoundary.test.mjs      Lower the baseline after removing a use: node test/platformBoundary.test.mjs --write
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const BASELINE = path.join(HERE, 'platformBoundaryBaseline.json');

// The injected parts themselves: the platform's DOM implementation, the hardware transports (WebHID / Trezor Connect) and the IndexedDB vault storage.
const ADAPTERS = [/^platform\//, /^auth\/ledgerTransport\.ts$/, /^auth\/trezorTransport\.ts$/, /^vault\/browserStorage\.ts$/];
const DEVICE = /\b(chrome\.|localStorage|sessionStorage|window|document|navigator)\b/g;
const DEPLOYMENT = /\b(isExtension|IS_EXTENSION)\b|\bappType\s*[!=]==?\s|APP_TYPE\.EXTENSION|APP_TYPE\.WEB/g;

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield full;
  }
}

/** The lines of code: whole-line and trailing comments removed, string and template contents blanked (a word inside a message is not a use). */
function codeLines(text) {
  let inBlock = false;
  return text.replace(/\r\n/g, '\n').split('\n').map((line) => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      if (inBlock) {
        if (line[i] === '*' && line[i + 1] === '/') { inBlock = false; i++; }
        continue;
      }
      if (line[i] === '/' && line[i + 1] === '*') { inBlock = true; i++; continue; }
      if (line[i] === '/' && line[i + 1] === '/') break;
      if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
        const quote = line[i];
        let j = i + 1;
        while (j < line.length && line[j] !== quote) j += line[j] === '\\' ? 2 : 1;
        out += quote + quote;
        i = j;
        continue;
      }
      out += line[i];
    }
    return out;
  });
}

const found = {};
const deployment = [];
for (const file of files(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const lines = codeLines(fs.readFileSync(file, 'utf8'));
  let count = 0;
  lines.forEach((line, index) => {
    count += (line.match(DEVICE) ?? []).length;
    if (DEPLOYMENT.test(line)) deployment.push(`${rel}:${index + 1}`);
    DEPLOYMENT.lastIndex = 0;
  });
  if (count && !ADAPTERS.some((re) => re.test(rel))) found[rel] = count;
}

if (process.argv.includes('--write')) {
  fs.writeFileSync(BASELINE, JSON.stringify(found, Object.keys(found).sort(), 2) + '\n');
  console.log('baseline written:', Object.keys(found).length, 'files');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const results = [];
const check = (name, ok, detail) => results.push([ok ? 'PASS' : 'FAIL', ok ? name : `${name} :: ${detail}`]);

check('no branch on the deployment inside the component', deployment.length === 0, deployment.join(', '));
const worse = Object.entries(found).filter(([file, n]) => n > (baseline[file] ?? 0)).map(([file, n]) => `${file} ${baseline[file] ?? 0} -> ${n}`);
check('no new use of the device (window, document, navigator, localStorage, chrome) outside the adapters, and no file above its baseline', worse.length === 0, worse.join(' | '));
const lower = Object.entries(baseline).filter(([file, n]) => (found[file] ?? 0) < n).map(([file, n]) => `${file} ${n} -> ${found[file] ?? 0}`);
check('the baseline is current (a removed use lowers it: node test/platformBoundary.test.mjs --write)', lower.length === 0, lower.join(' | '));

for (const [status, name] of results) console.log(status, name);
const failed = results.filter(([status]) => status === 'FAIL').length;
console.log(failed ? `\n${failed} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
