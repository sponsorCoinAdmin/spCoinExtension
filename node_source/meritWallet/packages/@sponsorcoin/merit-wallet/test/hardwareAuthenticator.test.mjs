// File: test/hardwareAuthenticator.test.mjs
//
// Row 16 of docs/design/accountAuthDesign.txt: the hardware authenticator (src/auth/hardwareAuthenticator.ts) over a FAKE transport (no device is needed): connect lists the device's accounts, signing and sending go
// to the device and come back in the one error set (declined on the device = user_rejected, locked or Ethereum app closed = locked, not connected = unreachable), an address the device does not hold is unauthorized,
// typed data is not offered, and a broadcast failure keeps its own error. Run: node test/hardwareAuthenticator.test.mjs
// MUTANT=rejectNotTranslated|lockedAsUnreachable|noConnectCheck|unknownAddressSigns|broadcastRelabelled|typedDataOffered run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
  if (rel === 'auth/hardwareAuthenticator') {
    if (m === 'rejectNotTranslated') mutate("if (error.code === 'rejected') throw new AuthenticatorError('user_rejected'", "if (false) throw new AuthenticatorError('user_rejected'");
    if (m === 'lockedAsUnreachable') mutate("if (error.code === 'locked' || error.code === 'app_closed') throw", 'if (false) throw');
    if (m === 'noConnectCheck') mutate("if (!transport.isConnected()) throw new AuthenticatorError('unreachable', 'The device is not connected. Connect it first.', id);", '');
    if (m === 'unknownAddressSigns') mutate('if (!transport.accounts().some((a) => a.address.toLowerCase() === key)) throw', 'if (false) throw');
    if (m === 'broadcastRelabelled') mutate('return { hash: await options.broadcast(raw, tx.chainId) };\n    },', 'try { return { hash: await options.broadcast(raw, tx.chainId) }; } catch (e) { return translate(e); }\n    },');
    if (m === 'typedDataOffered') mutate('signTypedData: false', 'signTypedData: true');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createHardwareAuthenticator, HardwareError } = load('auth/hardwareAuthenticator');
const { AuthenticatorError } = load('auth/authenticator');

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
function fakeTransport(over = {}) {
  const listeners = new Set();
  return {
    kind: 'ledger', supported: true, connected: false, fail: undefined, calls: [],
    isSupported() { return this.supported; },
    isConnected() { return this.connected; },
    async connect() { if (this.fail) throw this.fail; this.connected = true; return [{ address: A1, path: "m/44'/60'/0'/0/0" }]; },
    async disconnect() { this.connected = false; },
    accounts() { return [{ address: A1 }]; },
    async signMessage(a, msg) { this.calls.push(['msg', a, msg]); if (this.fail) throw this.fail; return '0xsig'; },
    async signTransaction(tx) { this.calls.push(['tx', tx.from]); if (this.fail) throw this.fail; return '0xraw'; },
    onChange(l) { listeners.add(l); return () => listeners.delete(l); },
    emit() { listeners.forEach((l) => l()); },
    ...over,
  };
}
const make = (t, broadcast = async (raw) => '0xhash:' + raw) => createHardwareAuthenticator(t, { broadcast });
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const code = (c) => (e) => e instanceof AuthenticatorError && e.code === c && e.authenticatorId === 'hardware:ledger';

await test('the shape: id by device kind, no vault, signing-only flags, typed data not offered', async () => {
  const a = make(fakeTransport());
  assert.equal(a.id, 'hardware:ledger');
  assert.equal(a.label, 'Ledger');
  assert.equal(a.vault, undefined);
  assert.deepEqual([a.capabilities.signMessage, a.capabilities.sendTransaction, a.capabilities.createAccount, a.capabilities.importKey, a.capabilities.signTypedData], [true, true, false, false, false]);
  assert.equal(a.signTypedData, undefined);
});

await test('status: available when the browser can talk to the device, "unlocked" once it is connected', async () => {
  const t = fakeTransport();
  const a = make(t);
  assert.deepEqual(await a.status(), { available: true, unlocked: false });
  await a.connect();
  assert.deepEqual(await a.status(), { available: true, unlocked: true });
  t.supported = false;
  assert.equal((await a.status()).available, false);
});

await test('connect lists the device accounts; accounts() is empty until then and again after disconnect', async () => {
  const a = make(fakeTransport());
  assert.deepEqual(await a.accounts(), []);
  const rows = await a.connect();
  assert.deepEqual(rows.map((r) => [r.address, r.source]), [[A1, 'hardware:ledger']]);
  assert.equal((await a.accounts()).length, 1);
  await a.disconnect();
  assert.deepEqual(await a.accounts(), []);
});

await test('connect in a browser that cannot talk to the device is "unreachable"', async () => {
  await assert.rejects(make(fakeTransport({ supported: false })).connect(), code('unreachable'));
});

await test('a message and a transaction are signed by the device; the app broadcasts the raw transaction', async () => {
  const t = fakeTransport();
  const a = make(t);
  await a.connect();
  assert.equal(await a.signMessage(A1, 'hi'), '0xsig');
  assert.deepEqual(await a.sendTransaction({ from: A1, chainId: 1 }), { hash: '0xhash:0xraw' });
  assert.deepEqual(t.calls.map((c) => c[0]), ['msg', 'tx']);
});

await test('not connected is "unreachable" and the device is never asked', async () => {
  const t = fakeTransport();
  const a = make(t);
  await assert.rejects(a.signMessage(A1, 'x'), code('unreachable'));
  assert.deepEqual(t.calls, []);
});

await test('an address the device does not hold is "unauthorized" and the device is never asked', async () => {
  const t = fakeTransport();
  const a = make(t);
  await a.connect();
  await assert.rejects(a.signMessage(A2, 'x'), code('unauthorized'));
  await assert.rejects(a.sendTransaction({ from: A2, chainId: 1 }), code('unauthorized'));
  assert.deepEqual(t.calls, []);
});

await test('declined on the device is user_rejected; locked or Ethereum app closed is locked; no foreign error escapes', async () => {
  const t = fakeTransport();
  const a = make(t);
  await a.connect();
  t.fail = new HardwareError('rejected', 'no');
  await assert.rejects(a.signMessage(A1, 'x'), code('user_rejected'));
  await assert.rejects(a.sendTransaction({ from: A1, chainId: 1 }), code('user_rejected'));
  t.fail = new HardwareError('locked', 'pin');
  await assert.rejects(a.signMessage(A1, 'x'), code('locked'));
  t.fail = new HardwareError('app_closed', 'open the app');
  await assert.rejects(a.signMessage(A1, 'x'), code('locked'));
  t.fail = new HardwareError('unsupported', 'too long');
  await assert.rejects(a.signMessage(A1, 'x'), code('unsupported'));
  t.fail = new Error('TransportStatusError 0x6985');
  await assert.rejects(a.signMessage(A1, 'x'), code('unreachable'));
});

await test('a failure to broadcast keeps the network error (it is not blamed on the device)', async () => {
  const a = make(fakeTransport(), async () => { throw new Error('nonce too low'); });
  await a.connect();
  await assert.rejects(a.sendTransaction({ from: A1, chainId: 1 }), (e) => !(e instanceof AuthenticatorError) && /nonce too low/.test(e.message));
});

await test('a plug pulled out is announced to a subscriber, and unsubscribe stops it', async () => {
  const t = fakeTransport();
  const a = make(t);
  const seen = [];
  const off = a.onChange((c) => seen.push(c));
  t.emit();
  off();
  t.emit();
  assert.deepEqual(seen, ['availability']);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
