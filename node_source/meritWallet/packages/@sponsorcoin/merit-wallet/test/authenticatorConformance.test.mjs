// File: test/authenticatorConformance.test.mjs
//
// Rows 11 and 17 of docs/design/accountAuthDesign.txt (the seamless paths and the configuration matrix): ONE set of SIGNING scenarios run through every kind of Authenticator, each over a fake of what it sits on, and they must give
// the SAME outcomes in the SAME error set:
//   local vault          createVaultAuthenticator over a real in-memory vault, with a real approval queue (the browser vault, and the extension's vault once it is behind the worker)
//   injected wallet      createInjectedAuthenticator over a fake EIP-1193 provider (MetaMask, the Merit extension seen from a web page)
//   phone                createPhoneAuthenticator over a fake native key manager
// Scenarios: the shape of status / accounts, a signature comes back as hex, a refusal is user_rejected, an address the backend does not hold is unauthorized, a locked backend is 'locked', lock and unlock are announced and
// unsubscribe works, a transaction returns a hash, and NO foreign error escapes. A backend that has no lock (an injected wallet) skips the lock scenarios by its own capability flag. Run: node test/authenticatorConformance.test.mjs
// MUTANT=vaultRejectNotTranslated|injectedRejectNotTranslated|phoneCancelAsLocked|lockedNotChecked|unsubscribeBroken run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;

const tweaks = {
  'vault/vaultAuthenticator': m === 'vaultRejectNotTranslated' ? (s) => s.replace("if (error instanceof ApprovalRejectedError) throw new AuthenticatorError('user_rejected', error.message, id);", '') : undefined,
  'auth/injectedAuthenticator': m === 'injectedRejectNotTranslated' ? (s) => s.replace("case 4001:\n      return new AuthenticatorError('user_rejected', text || `${label}: the request was rejected.`, id);", 'case 4001:\n      return error;') : m === 'unsubscribeBroken' ? (s) => s.replace("provider?.removeListener?.('accountsChanged', accountsChanged);", '') : undefined,
  'vault/phoneVault': m === 'phoneCancelAsLocked' ? (s) => s.replace("error.code === 'cancelled' ? 'user_rejected' : 'locked'", "'locked'").replace("if (!manager.isUnlocked()) throw new AuthenticatorError('locked'", m === 'lockedNotChecked' ? "if (false) throw new AuthenticatorError('locked'" : "if (!manager.isUnlocked()) throw new AuthenticatorError('locked'") : (m === 'lockedNotChecked' ? (s) => s.replace("if (!manager.isUnlocked()) throw new AuthenticatorError('locked'", "if (false) throw new AuthenticatorError('locked'") : undefined),
  'wallet/wallet': undefined,
};
const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (tweaks[rel]) src = tweaks[rel](src);
  const mod = { exports: {} };
  cache.set(file, mod);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createLocalVaultParts } = load('vault/vaultCapability');
const { createVaultAuthenticator } = load('vault/vaultAuthenticator');
const { ApprovalController } = load('vault/approvals');
const { HARDHAT_DEV_MNEMONIC } = load('vault/walletAccounts');
const { createInjectedAuthenticator } = load('auth/injectedAuthenticator');
const { createPhoneAuthenticator, PhoneAuthError } = load('vault/phoneVault');
const { AuthenticatorError } = load('auth/authenticator');

const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x1111111111111111111111111111111111111111';
const pw = (value) => ({ kind: 'password', value });
const tick = () => new Promise((r) => setTimeout(r, 10));
const memStorage = () => { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; };

// each backend returns { auth, address, decide(mode), lock(), unlock() }
async function localVault() {
  const parts = createLocalVaultParts({ storage: memStorage(), iterations: 1000 });
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const approvals = new ApprovalController();
  let mode = 'approve';
  approvals.onChange(() => { for (const r of approvals.list()) { if (mode === 'approve') void approvals.approve(r.id); else approvals.reject(r.id, 'No thanks.'); } });
  const auth = createVaultAuthenticator({ id: 'browserVault', label: 'Browser', parts, approvals, rpcUrlFor: () => undefined, transportFor: () => ({ request: async ({ method }) => (method === 'eth_chainId' ? '0x7a69' : method === 'eth_sendRawTransaction' ? '0xabc126' : method === 'eth_getTransactionCount' ? '0x0' : method === 'eth_estimateGas' ? '0x5208' : method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas' ? '0x1' : method === 'eth_getBlockByNumber' ? { baseFeePerGas: '0x1' } : '0x0') }) });
  return { auth, address: HH0, decide: (next) => { mode = next; }, lock: () => parts.vault.lock(), unlock: () => parts.vault.unlock(pw('password-1')), sendSupported: false };
}
async function injected() {
  let mode = 'approve';
  const listeners = new Map();
  const provider = {
    async request({ method, params }) {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [HH0];
      if (method === 'personal_sign' || method === 'eth_sendTransaction') {
        const from = method === 'personal_sign' ? params[1] : params[0].from;
        if (String(from).toLowerCase() !== HH0.toLowerCase()) throw Object.assign(new Error('Not authorized.'), { code: 4100 });
        if (mode === 'reject') throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
        return method === 'personal_sign' ? '0xabc123' : '0xabc124';
      }
      if (method === 'eth_chainId') return '0x7a69';
      return null;
    },
    on(event, l) { const set = listeners.get(event) ?? new Set(); set.add(l); listeners.set(event, set); },
    removeListener(event, l) { listeners.get(event)?.delete(l); },
  };
  const auth = createInjectedAuthenticator({ id: 'injected:io.metamask', label: 'MetaMask', getProvider: () => provider });
  return { auth, address: HH0, decide: (next) => { mode = next; }, emit: () => listeners.get('accountsChanged')?.forEach((l) => l([HH0])), sendSupported: true };
}
async function phone() {
  let unlocked = true; let mode = 'approve';
  const listeners = new Set(); const notify = () => listeners.forEach((l) => l());
  const manager = {
    platform: 'ios', isAvailable: async () => true, isSetUp: async () => true, async setUp() { return { accounts: [] }; }, async authenticate() { unlocked = true; notify(); },
    isUnlocked: () => unlocked, lock() { unlocked = false; notify(); }, accounts: () => [{ address: HH0, name: 'Phone' }], async addAccount() { return { address: OTHER }; },
    async signMessage() { if (mode === 'reject') throw new PhoneAuthError('cancelled', 'Declined'); return '0xabc123'; },
    async signTransaction() { if (mode === 'reject') throw new PhoneAuthError('cancelled', 'Declined'); return '0xraw'; },
    async deleteWallet() {}, onChange(l) { listeners.add(l); return () => listeners.delete(l); },
  };
  const auth = createPhoneAuthenticator(manager, { broadcast: async () => '0xabc125' });
  return { auth, address: HH0, decide: (next) => { mode = next; }, lock: () => manager.lock(), unlock: () => manager.authenticate('x'), sendSupported: true };
}
const BACKENDS = [['local vault', localVault], ['injected wallet', injected], ['phone', phone]];

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const outcome = async (p) => { try { return { ok: true, value: await p }; } catch (e) { return { ok: false, error: e }; } };
const mustBeAuthError = (r, code, what) => {
  assert.equal(r.ok, false, what + ': it should have failed');
  assert.ok(r.error instanceof AuthenticatorError, what + ': a foreign error escaped: ' + (r.error && r.error.constructor && r.error.constructor.name) + ' ' + (r.error && r.error.message));
  assert.equal(r.error.code, code, what + ': code ' + r.error.code);
};

for (const [name, make] of BACKENDS) {
  await test(`${name}: the shape: id, label, capability flags, status and accounts`, async () => {
    const b = await make();
    assert.equal(typeof b.auth.id, 'string'); assert.equal(typeof b.auth.label, 'string');
    for (const k of ['signMessage', 'signTypedData', 'sendTransaction', 'listAccounts', 'createAccount', 'importKey', 'lock']) assert.equal(typeof b.auth.capabilities[k], 'boolean', k);
    const status = await b.auth.status();
    assert.equal(typeof status.available, 'boolean'); assert.equal(typeof status.unlocked, 'boolean');
    const accounts = await b.auth.accounts();
    assert.ok(accounts.some((a) => a.address.toLowerCase() === b.address.toLowerCase()), 'the account is not listed');
  });
  await test(`${name}: a signature comes back as hex; a refusal is user_rejected`, async () => {
    const b = await make();
    const ok = await b.auth.signMessage(b.address, 'hello');
    assert.match(ok, /^0x[0-9a-fA-F]+$/);
    b.decide('reject');
    mustBeAuthError(await outcome(b.auth.signMessage(b.address, 'hello')), 'user_rejected', 'a refused signature');
  });
  await test(`${name}: an address this backend does not hold is unauthorized`, async () => {
    const b = await make();
    mustBeAuthError(await outcome(b.auth.signMessage(OTHER, 'hello')), 'unauthorized', 'a foreign address');
  });
  await test(`${name}: a transaction returns a hash (or the backend says it cannot): a refusal there is user_rejected too`, async () => {
    const b = await make();
    if (!b.sendSupported) return; // the local vault needs a chain behind it; its send path is covered in test/browserVault.test.mjs
    const sent = await b.auth.sendTransaction({ from: b.address, to: OTHER, value: 1n, chainId: 31337 });
    assert.match(sent.hash, /^0x[0-9a-fA-F]+$/);
    b.decide('reject');
    mustBeAuthError(await outcome(b.auth.sendTransaction({ from: b.address, to: OTHER, value: 1n, chainId: 31337 })), 'user_rejected', 'a refused transaction');
  });
  if ((await make()).auth.capabilities.lock) {
    await test(`${name}: a locked backend is 'locked', not a silent unlock; lock and unlock are announced; unsubscribe works`, async () => {
      const b = await make();
      const seen = [];
      const off = b.auth.onChange((change) => seen.push(change));
      b.lock(); await tick();
      assert.ok(seen.length >= 1, 'the lock was not announced');
      assert.equal((await b.auth.status()).unlocked, false);
      mustBeAuthError(await outcome(b.auth.signMessage(b.address, 'hello')), 'locked', 'a locked signature');
      await b.unlock(); await tick();
      assert.equal((await b.auth.status()).unlocked, true);
      assert.match(await b.auth.signMessage(b.address, 'hello'), /^0x/);
      off();
      const after = seen.length;
      b.lock(); await tick();
      assert.equal(seen.length, after, 'a change was announced after unsubscribe');
    });
  } else {
    await test(`${name}: no lock capability: the wallet's own announcements still reach a subscriber and stop on unsubscribe`, async () => {
      const b = await make();
      const seen = [];
      const off = b.auth.onChange((change) => seen.push(change));
      await tick(); b.emit(); await tick();
      assert.ok(seen.includes('accountsChanged'));
      off(); await tick();
      const after = seen.length; b.emit(); await tick();
      assert.equal(seen.length, after, 'a change was announced after unsubscribe');
    });
  }
}
for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
