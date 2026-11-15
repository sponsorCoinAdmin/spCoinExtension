// File: test/addTarget.test.mjs
//
// Tests for which wallet the Add a Wallet/Account screen adds to (src/wallet/addTarget.ts, docs/design/accountAuthDesign.txt section 18 section 5). Run: node test/addTarget.test.mjs
// MUTANT=noTimeout|onlyIgnored|signingOnlyListed|unreachableListed|defaultIgnoresActive|reasonWrongFlag|reasonNoName run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'wallet', 'addTarget.ts'), 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
const m = process.env.MUTANT;
// a wallet that never answers holds the screen back
if (m === 'noTimeout') mutate('withTimeout(Promise.resolve(wallet.registry.get(backend.id)?.status()), TARGET_STATUS_TIMEOUT_MS)', 'Promise.resolve(wallet.registry.get(backend.id)?.status())');
// the host's list of wallets it can add to is ignored
if (m === 'onlyIgnored') mutate('(!only || only.includes(backend.id))', 'true');
// a signing-only wallet (MetaMask) is offered as a place to add keys
if (m === 'signingOnlyListed') mutate('backend.keepsKeys && (!only', '(!only');
// a wallet that cannot be reached is offered
if (m === 'unreachableListed') mutate('if (answers[i]?.available) targets.push(', 'if (true) targets.push(');
// the active wallet is not the starting point
if (m === 'defaultIgnoresActive') mutate('const defaultId = active && targets.some((t) => t.id === active) ? active : targets[0]?.id;', 'const defaultId = targets[0]?.id;');
// importing a private key is judged by the wrong capability
if (m === 'reasonWrongFlag') mutate('if (!target.features.importKey) reasons.importAccount', 'if (!target.features.importPhrase) reasons.importAccount');
// the reason does not say which wallet it is about
if (m === 'reasonNoName') mutate('reasons.createAccount = `${target.name} cannot create accounts here.`', "reasons.createAccount = 'This wallet cannot create accounts here.'");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => req(id), mod, mod.exports);
const { readAddTargets, addEntryReasons } = mod.exports;

const A = '0xaaaa000000000000000000000000000000000001';
const features = (over = {}) => ({ addAccount: true, importKey: true, importPhrase: true, ...over });
const makeWallet = ({ backends, statuses = {}, active = {} }) => ({
  backends: () => backends,
  registry: { get: (id) => ({ status: async () => statuses[id] ?? { available: true, unlocked: true } }) },
  backendIdFor: (address) => active[address],
});
const ext = { id: 'localVault', name: 'Merit Wallet (Extension)', keepsKeys: true, features: features() };
const web = { id: 'browserVault', name: 'Merit Wallet (Web)', keepsKeys: true, features: features() };
const metaMask = { id: 'injected:io.metamask', name: 'MetaMask', keepsKeys: false, features: features({ addAccount: false, importKey: false, importPhrase: false }) };
const phone = { id: 'deviceVault', name: 'Merit Wallet (Android)', keepsKeys: true, features: features({ importKey: false, importPhrase: false }) };

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

await test('only wallets that keep keys and can be reached are places to add to; a signing-only wallet (MetaMask) is not', async () => {
  const w = makeWallet({ backends: [ext, metaMask, web], statuses: { browserVault: { available: false, unlocked: false } } });
  const { targets } = await readAddTargets(w, undefined);
  assert.deepEqual(targets.map((t) => t.id), ['localVault']);
});

await test('the screen starts on the ACTIVE wallet; with no active account (or one a signing-only wallet holds) on the host\'s own, the first registered', async () => {
  const w = makeWallet({ backends: [ext, web], active: { [A]: 'browserVault' } });
  assert.equal((await readAddTargets(w, A)).defaultId, 'browserVault');
  assert.equal((await readAddTargets(w, undefined)).defaultId, 'localVault');
  const viaMeta = makeWallet({ backends: [ext, metaMask], active: { [A]: 'injected:io.metamask' } });
  assert.equal((await readAddTargets(viaMeta, A)).defaultId, 'localVault');
});

await test('a wallet that never answers (or fails) is left out and does not hold the others back', async () => {
  const w = makeWallet({ backends: [web, ext, phone] });
  const base = w.registry.get;
  w.registry.get = (id) => (id === 'browserVault' ? { status: () => new Promise(() => {}) } : id === 'deviceVault' ? { status: async () => { throw new Error('boom'); } } : base(id));
  const r = await Promise.race([readAddTargets(w, undefined), new Promise((resolve) => setTimeout(() => resolve('HUNG'), 6000))]);
  assert.notEqual(r, 'HUNG', 'the screen waited for a wallet that never answers');
  assert.deepEqual(r.targets.map((t) => t.id), ['localVault']);
});

await test('only the wallets the host can add to are asked and listed', async () => {
  const w = makeWallet({ backends: [web, ext] });
  const r = await readAddTargets(w, undefined, ['localVault']);
  assert.deepEqual(r.targets.map((t) => t.id), ['localVault']);
});

await test('no wallet that keeps keys: no targets and no default', async () => {
  const r = await readAddTargets(makeWallet({ backends: [metaMask] }), undefined);
  assert.deepEqual([r.targets.length, r.defaultId], [0, undefined]);
});

await test('a wallet that can do everything has no reasons; one that cannot says so in its own name, per entry', () => {
  assert.deepEqual(addEntryReasons({ id: 'localVault', name: 'Merit Wallet (Extension)', features: features() }), {});
  const r = addEntryReasons({ id: 'deviceVault', name: 'Merit Wallet (Android)', features: features({ importKey: false, importPhrase: false }) });
  assert.equal(r.createAccount, undefined);
  assert.match(r.importAccount, /^Merit Wallet \(Android\) cannot import a private key/);
  assert.match(r.importWallet, /^Merit Wallet \(Android\) cannot import a recovery phrase/);
  // each entry is judged by its own capability, not a neighbour's
  const onlyKey = addEntryReasons({ id: 'k', name: 'K', features: features({ importKey: false }) });
  assert.match(onlyKey.importAccount, /^K cannot import a private key/);
  assert.equal(onlyKey.importWallet, undefined);
  const onlyPhrase = addEntryReasons({ id: 'p', name: 'P', features: features({ importPhrase: false }) });
  assert.equal(onlyPhrase.importAccount, undefined);
  assert.match(onlyPhrase.importWallet, /^P cannot import a recovery phrase/);
  const none = addEntryReasons({ id: 'x', name: 'X', features: features({ addAccount: false }) });
  assert.match(none.createAccount, /^X cannot create accounts here/);
});

await test('with no target there is nothing to judge', () => {
  assert.deepEqual(addEntryReasons(undefined), {});
});

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
