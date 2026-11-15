// File: test/accountSigning.test.mjs
//
// Tests for who signs for an account and switching it (src/wallet/accountSigning.ts, docs/design/accountAuthDesign.txt row 15, 5.1 / 5.6). Run: node test/accountSigning.test.mjs
// MUTANT=switchToNonHolder|warnWhenReady|noLockedState|savedNotRead|switchLosesNothing run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const FILE = path.join(HERE, '..', 'src', 'wallet', 'accountSigning.ts');
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
const m = process.env.MUTANT;
// the switch accepts a holder that does not have the account
if (m === 'switchToNonHolder') mutate("if (!choices.holders.some((h) => h.id === id)) throw new Error(`${wallet.backend(id)?.label ?? id} does not hold this account.`);", '');
// a warning is raised even for a holder that can sign
if (m === 'warnWhenReady') mutate("if (!holder || holder.state === 'ready') return '';", "if (!holder) return '';");
// a locked holder is reported as ready
if (m === 'noLockedState') mutate("if (!status.unlocked && canLock) return 'locked';", '');
// the saved choice is never read (the app default is always reported)
if (m === 'savedNotRead') mutate('const savedId = wallet.getActiveAuthenticator(address);', 'const savedId = undefined;');
// switching also clears the choice of every other account (a switch must touch only its own account)
if (m === 'switchLosesNothing') mutate('wallet.setActiveAuthenticator(address, id);\n  return readSigningChoices', "wallet.setActiveAuthenticator(address, id);\n  wallet.setActiveAuthenticator('0xother', undefined);\n  return readSigningChoices");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
// the one relative import: the shared address comparison (wallet/sameAddress.ts), loaded the same way
const sameMod = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wallet', 'sameAddress.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(req, sameMod, sameMod.exports);
new Function('require', 'module', 'exports', js)((id) => (id === './sameAddress' ? sameMod.exports : req(id)), mod, mod.exports);
const { readSigningChoices, chooseSigner, signingWarning } = mod.exports;

const A = '0xaaaa000000000000000000000000000000000001';
const OTHER = '0xother';
// a fake wallet: backends, which of them list which account, statuses, a saved-choice store, an app default
const makeWallet = ({ holders = {}, statuses = {}, appDefault, lock = {} } = {}) => {
  const saved = {};
  const log = [];
  const ids = [...new Set(Object.values(holders).flat())];
  return {
    saved,
    log,
    registry: { get: (id) => ({ status: async () => statuses[id] ?? { available: true, unlocked: true } }) },
    backend: (id) => ({ id, label: id.toUpperCase(), name: id.toUpperCase(), where: id === 'serverKeystore' ? 'the dev server' : '', features: { lock: !!lock[id] } }),
    backends: () => ids.map((id) => ({ id })),
    accounts: async () => Object.entries(holders).map(([address, backends]) => ({ address, backends, authenticatorId: backends[0], badge: '' })),
    backendIdFor: (address) => saved[address] ?? (holders[address] ? holders[address][0] : appDefault),
    getActiveAuthenticator: (address) => saved[address],
    setActiveAuthenticator: (address, id) => { log.push([address, id]); if (id === undefined) delete saved[address]; else saved[address] = id; },
  };
};

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

await test('an account with two holders lists both, marks the one that signs and can be switched', async () => {
  const w = makeWallet({ holders: { [A]: ['serverKeystore', 'localVault'] } });
  const c = await readSigningChoices(w, A);
  assert.deepEqual(c.holders.map((h) => [h.id, h.isActive]), [['serverKeystore', true], ['localVault', false]]);
  assert.equal(c.canSwitch, true);
  assert.equal(c.savedId, undefined);
  assert.equal(c.warning, '');
});

await test('switching is instant: the saved choice changes, the account keeps both holders, and the other holder is now the active one', async () => {
  const w = makeWallet({ holders: { [A]: ['serverKeystore', 'localVault'] } });
  const c = await chooseSigner(w, A, 'localVault');
  assert.equal(c.activeId, 'localVault');
  assert.equal(c.savedId, 'localVault');
  assert.equal(c.holders.length, 2);
  assert.deepEqual(w.log, [[A, 'localVault']]);
});

await test('only a holder of the account can be chosen; nothing is saved for any other', async () => {
  const w = makeWallet({ holders: { [A]: ['serverKeystore'] } });
  await assert.rejects(() => chooseSigner(w, A, 'injected:io.metamask'), /does not hold this account/);
  assert.deepEqual(w.log, []);
});

await test('an unreachable active holder is said in words, with the way out when there is another holder', async () => {
  const w = makeWallet({ holders: { [A]: ['injected:io.metamask', 'localVault'] }, statuses: { 'injected:io.metamask': { available: false, unlocked: false } } });
  const c = await readSigningChoices(w, A);
  assert.match(c.warning, /INJECTED:IO\.METAMASK is not reachable/);
  assert.match(c.warning, /Choose another holder/);
  const one = makeWallet({ holders: { [A]: ['injected:io.metamask'] }, statuses: { 'injected:io.metamask': { available: false, unlocked: false } } });
  assert.doesNotMatch((await readSigningChoices(one, A)).warning, /Choose another holder/);
});

await test('a locked holder says it is locked, an unlocked or lock-less one says nothing', async () => {
  const locked = makeWallet({ holders: { [A]: ['localVault'] }, statuses: { localVault: { available: true, unlocked: false } }, lock: { localVault: true } });
  assert.match((await readSigningChoices(locked, A)).warning, /LOCALVAULT is locked/);
  const noLock = makeWallet({ holders: { [A]: ['injected:io.metamask'] }, statuses: { 'injected:io.metamask': { available: true, unlocked: false } } });
  assert.equal((await readSigningChoices(noLock, A)).warning, '');
});

await test('the saved choice is reported, and clearing it returns to the app default', async () => {
  const w = makeWallet({ holders: { [A]: ['serverKeystore', 'localVault'] } });
  await chooseSigner(w, A, 'localVault');
  assert.equal((await readSigningChoices(w, A)).savedId, 'localVault');
  const back = await chooseSigner(w, A, undefined);
  assert.equal(back.savedId, undefined);
  assert.equal(back.activeId, 'serverKeystore');
});

await test('switching one account never touches another account\'s choice', async () => {
  const w = makeWallet({ holders: { [A]: ['serverKeystore', 'localVault'], [OTHER]: ['serverKeystore', 'localVault'] } });
  w.saved[OTHER] = 'localVault';
  await chooseSigner(w, A, 'localVault');
  assert.equal(w.saved[OTHER], 'localVault');
});

await test('a plain sentence builder: nothing for a ready holder', () => {
  assert.equal(signingWarning({ label: 'X', state: 'ready' }, 1), '');
  assert.equal(signingWarning(undefined, 0), '');
});

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
