// File: test/meritConnectBoundary.test.mjs
//
// Guards docs/design/accountAuthDesign.txt section 15, item H6: nothing outside components/wallet reaches into the wallet's internals. The ONLY files of components/wallet/lib/meritConnect that other code may
// import are its public entry points: index (connection status and signing), accounts (account management and vault crypto), session (password cache, lock gate), authSource (a leaf by design) and the
// *.server files (server-only). Every other deep import is a violation. The entry points must stay pure re-exports (no logic), so they cannot become a second implementation.
// Run: node test/meritConnectBoundary.test.mjs
// MUTANT=deepImportAllowed|entryHasLogic run against deliberately broken inputs and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
const ENTRY_POINTS = new Set(['index', 'accounts', 'session', 'authSource']);
const IMPORT = /from\s+['"]@\/components\/wallet\/lib\/meritConnect(?:\/([A-Za-z0-9_.]+))?['"]/g;

function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'node_source', 'dist', '.git'].includes(d.name)) continue;
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(d.name)) out.push(p);
  }
  return out;
}

const files = ['app', 'lib', 'components', 'hooks', 'services']
  .map((d) => path.join(WEB, d)).filter((d) => fs.existsSync(d)).flatMap((d) => walk(d))
  .filter((f) => !path.relative(WEB, f).replace(/\\/g, '/').startsWith('components/wallet/'));
const sources = files.map((f) => [path.relative(WEB, f).replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')]);
if (m === 'deepImportAllowed') sources.push(['app/synthetic/Offender.ts', "import { x } from '@/components/wallet/lib/meritConnect/walletPasswordSession';"]);

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('there are files to check (the scan is not vacuous)', () => {
  assert.ok(sources.length > 200, 'only ' + sources.length + ' source files scanned');
  assert.ok(sources.some(([, s]) => IMPORT.test(s)), 'no file imports meritConnect at all');
  IMPORT.lastIndex = 0;
});
test('no file outside components/wallet imports a non-public meritConnect file', () => {
  const violations = [];
  for (const [file, src] of sources) {
    for (const match of src.matchAll(IMPORT)) {
      const target = match[1];
      if (!target) continue;
      const base = target.replace(/\.(ts|tsx)$/, '');
      if (ENTRY_POINTS.has(base) || /\.server$/.test(base)) continue;
      violations.push(`${file} imports meritConnect/${target}`);
    }
  }
  assert.deepEqual(violations, []);
});
test('the entry points accounts and session are pure re-exports', () => {
  for (const name of ['accounts', 'session']) {
    let src = fs.readFileSync(path.join(WEB, 'components', 'wallet', 'lib', 'meritConnect', name + '.ts'), 'utf8').replace(/\r\n/g, '\n');
    if (m === 'entryHasLogic' && name === 'accounts') src += '\nexport const secret = () => 1;\n';
    const code = src.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
    assert.ok(code.length > 0, name + ' is empty');
    for (const line of code) assert.match(line, /^export \* from '\.\/[A-Za-z]+';$/, `${name}.ts has more than re-exports: ${line}`);
  }
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
