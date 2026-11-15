// File: test/approvalWaiting.test.mjs
//
// Tests for the neutral "waiting for X to approve" state (src/auth/approvalWaiting.ts, docs/design/accountAuthDesign.txt row 11 / 6A). Run: node test/approvalWaiting.test.mjs
// 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 10): a refusal or failure also leaves a short-lived outcome line; a wallet whose own screen is on the page is tracked for its outcome only.
// MUTANT=keepOnFailure|noNotify|wrapChangesResult|doubleEnd|forgetOthers|noTextWhenEmpty|noOutcome|outcomeForever|silentShown|outcomeOnSuccess|oldOutcomeStays run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'auth', 'approvalWaiting.ts'), 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
const m = process.env.MUTANT;
// a request that fails stays pending forever
if (m === 'keepOnFailure') mutate("    } catch (error) {\n      end(error ?? 'the request failed');\n      throw error;\n    }", '    } catch (error) {\n      throw error;\n    }');
// a refusal leaves no outcome
if (m === 'noOutcome') mutate('if (error !== undefined) setOutcome(', 'if (false) setOutcome(');
// the outcome never goes away
if (m === 'outcomeForever') mutate('if (next) outcomeTimer = setTimeout(() => setOutcome(undefined), outcomeMs);', '');
// a wallet whose own screen is on the page is shown as "waiting"
if (m === 'silentShown') mutate('const pending = all.filter((e) => !e.silent);', 'const pending = all;');
// an approved request leaves an outcome too
if (m === 'outcomeOnSuccess') mutate('      const result = await run();\n      end();', "      const result = await run();\n      end('done');");
// a new request leaves the old answer on screen
if (m === 'oldOutcomeStays') mutate('if (outcome) setOutcome(undefined); // a new request replaces the old answer', '');
// subscribers are never told
if (m === 'noNotify') mutate('    listeners.forEach((l) => l());', '');
// the wrapper changes what the authenticator answers
if (m === 'wrapChangesResult') mutate("track('sign a message', () => authenticator.signMessage(address, message))", "track('sign a message', async () => (await authenticator.signMessage(address, message)) + '!')");
// ending twice removes another request too
if (m === 'doubleEnd') mutate('        if (ended) return;' + String.fromCharCode(10) + '        ended = true;' + String.fromCharCode(10), '');
// a second request replaces the first
if (m === 'forgetOthers') mutate('set([...state, { ...entry, id, startedAt: now() }]);', 'set([{ ...entry, id, startedAt: now() }]);');
// the sentence is not empty when nothing is pending
if (m === 'noTextWhenEmpty') mutate("if (pending.length === 0) return '';", '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
// the wallet's name comes from the package's walletName (src/auth/authenticator.ts, tested in walletName.test.mjs); the names the cases below read are stubbed here
const names = { 'injected:io.metamask': 'MetaMask' };
new Function('require', 'module', 'exports', js)((id) => (id === './authenticator' ? { walletName: (wid) => names[wid] ?? wid, authenticatorName: (a) => a.displayName ?? names[a.id] ?? a.id } : req(id)), mod, mod.exports);
const { createApprovalWaitingStore, approvalWaitingText, withApprovalNotice, outcomeText } = mod.exports;

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};
const fake = (over = {}) => ({
  id: 'injected:io.metamask',
  label: 'MetaMask',
  capabilities: {},
  status: async () => ({ available: true, unlocked: true }),
  accounts: async () => [{ address: '0xa' }],
  signMessage: async () => '0xsig',
  sendTransaction: async () => ({ hash: '0xhash' }),
  signTypedData: async () => '0xtyped',
  connect: async () => [{ address: '0xa' }],
  onChange: () => () => undefined,
  ...over,
});

await test('a request is pending exactly while it is open, and subscribers are told at both ends', async () => {
  const store = createApprovalWaitingStore();
  let release;
  const gate = new Promise((r) => { release = r; });
  const a = withApprovalNotice(fake({ signMessage: async () => { await gate; return '0xsig'; } }), store);
  let told = 0;
  store.subscribe(() => { told += 1; });
  const open = a.signMessage('0xa', 'hi');
  assert.equal(store.getState().length, 1);
  assert.deepEqual([store.getState()[0].authenticatorId, store.getState()[0].action], ['injected:io.metamask', 'sign a message']);
  release();
  assert.equal(await open, '0xsig');
  assert.equal(store.getState().length, 0);
  assert.equal(told, 2);
});

await test('a rejected or failed request stops waiting and the error reaches the caller unchanged', async () => {
  const store = createApprovalWaitingStore();
  const boom = new Error('User denied');
  const a = withApprovalNotice(fake({ sendTransaction: async () => { throw boom; } }), store);
  await assert.rejects(() => a.sendTransaction({ from: '0xa', chainId: 1 }), (e) => e === boom);
  assert.equal(store.getState().length, 0);
});

await test('the wrapper changes nothing else: results, identity, status, accounts and events are the authenticator\'s own', async () => {
  const store = createApprovalWaitingStore();
  const base = fake();
  const a = withApprovalNotice(base, store);
  assert.equal(await a.signMessage('0xa', 'x'), '0xsig');
  assert.deepEqual(await a.sendTransaction({ from: '0xa', chainId: 1 }), { hash: '0xhash' });
  assert.equal(await a.signTypedData('0xa', {}), '0xtyped');
  assert.deepEqual([a.id, a.label], [base.id, base.label]);
  assert.deepEqual(await a.status(), { available: true, unlocked: true });
  assert.deepEqual(await a.accounts(), [{ address: '0xa' }]);
});

await test('two open requests are both listed and each ends on its own', async () => {
  const store = createApprovalWaitingStore();
  const gates = [];
  const a = withApprovalNotice(fake({ signMessage: () => new Promise((r) => gates.push(r)) }), store);
  const first = a.signMessage('0xa', '1');
  const second = a.signMessage('0xa', '2');
  assert.equal(store.getState().length, 2);
  gates[0]('0x1');
  await first;
  assert.equal(store.getState().length, 1);
  gates[1]('0x2');
  await second;
  assert.equal(store.getState().length, 0);
});

await test('ending a request twice ends it once: nothing else is removed and nobody is told twice', () => {
  const store = createApprovalWaitingStore();
  const endA = store.begin({ authenticatorId: 'a', label: 'A', action: 'connect' });
  store.begin({ authenticatorId: 'b', label: 'B', action: 'connect' });
  let told = 0;
  store.subscribe(() => { told += 1; });
  endA();
  endA();
  assert.equal(store.getState().length, 1);
  assert.equal(told, 1, 'a second end must not announce a change');
});

await test('the sentence names the wallet and the action in one neutral line; nothing is said when nothing is pending', () => {
  const store = createApprovalWaitingStore();
  assert.equal(approvalWaitingText(store.getState()), '');
  store.begin({ authenticatorId: 'injected:io.metamask', label: 'MetaMask', action: 'send a transaction' });
  const one = approvalWaitingText(store.getState());
  assert.match(one, /^Waiting for MetaMask to approve this transaction\./);
  assert.doesNotMatch(one, /requests are open/);
  store.begin({ authenticatorId: 'x', label: 'Y', action: 'connect' });
  assert.match(approvalWaitingText(store.getState()), /2 requests are open/);
});

await test('a refused request leaves one line in the wallet\'s own words, and it goes away after a few seconds', async () => {
  const store = createApprovalWaitingStore(Date.now, 40);
  const rejecting = fake({ signMessage: async () => { throw new Error('User rejected the request.'); } });
  await assert.rejects(withApprovalNotice(rejecting, store).signMessage('0xa', 'hi'));
  assert.equal(store.getOutcome().text, 'MetaMask did not approve: User rejected the request.');
  assert.equal(approvalWaitingText(store.getState()), '', 'nothing is waiting any more');
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(store.getOutcome(), undefined);
});

await test('an approved request leaves no outcome, and a new request clears an old one', async () => {
  const store = createApprovalWaitingStore(Date.now, 5000);
  const failing = fake({ signMessage: async () => { throw new Error('nope'); } });
  await assert.rejects(withApprovalNotice(failing, store).signMessage('0xa', 'hi'));
  assert.ok(store.getOutcome());
  await withApprovalNotice(fake(), store).signMessage('0xa', 'hi');
  assert.equal(store.getOutcome(), undefined, 'the approved request replaced the old answer and left none of its own');
});

await test('a wallet whose own screen is on the page is never listed as waiting, but its refusal is still reported', async () => {
  const store = createApprovalWaitingStore(Date.now, 5000);
  let during;
  const own = fake({ id: 'browserVault', signMessage: async () => { during = approvalWaitingText(store.getState()); throw new Error('The request was not approved.'); } });
  await assert.rejects(withApprovalNotice(own, store, { showWaiting: false }).signMessage('0xa', 'hi'));
  assert.equal(during, '', 'no waiting line for its own screen');
  assert.match(store.getOutcome().text, /did not approve: The request was not approved\./);
});

await test('outcomeText uses the error\'s own words, or a plain fallback', () => {
  assert.equal(outcomeText('MetaMask', new Error('x')), 'MetaMask did not approve: x');
  assert.equal(outcomeText('MetaMask', 'plain'), 'MetaMask did not approve: plain');
  assert.equal(outcomeText('MetaMask', {}), 'MetaMask did not approve: the request failed');
});

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
