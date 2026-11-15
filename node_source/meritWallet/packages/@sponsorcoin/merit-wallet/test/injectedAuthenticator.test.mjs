// File: test/injectedAuthenticator.test.mjs
//
// Tests for the generic injected authenticator (src/auth/injectedAuthenticator.ts, docs/design/accountAuthDesign.txt section 17 items 4, 8, 9) against a fake EIP-1193 provider, and together with connectAccount.
// Run: node test/injectedAuthenticator.test.mjs
// MUTANT=plainMessage|swallowRejection|revokeThrows|noChainSwitch|statusIgnoresProvider run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src', 'auth');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8');
  if (file.endsWith('injectedAuthenticator.ts')) {
    const m = process.env.MUTANT;
    // the message goes to personal_sign as plain text, not hex
    if (m === 'plainMessage') src = src.replace("call<string>('personal_sign', [utf8Hex(message), address])", "call<string>('personal_sign', [message, address])");
    // a rejection in the wallet's popup is not translated
    if (m === 'swallowRejection') src = src.replace('    case 4001:\n      return new AuthenticatorError', '    case -1:\n      return new AuthenticatorError');
    // a wallet without wallet_revokePermissions makes disconnect fail
    if (m === 'revokeThrows') src = src.replace('if (code === -32601 || code === 4200) return;', '');
    // a transaction is sent without moving the wallet to the right network
    if (m === 'noChainSwitch') src = src.replace("if (String(current).toLowerCase() !== wanted) await call('wallet_switchEthereumChain', [{ chainId: wanted }]);", '');
    // status reports available even when there is no provider
    if (m === 'statusIgnoresProvider') src = src.replace('if (!provider) return { available: false, unlocked: false };', '');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { createInjectedAuthenticator, translateProviderError } = load(path.join(SRC, 'injectedAuthenticator.ts'));
const { AuthenticatorError } = load(path.join(SRC, 'authenticator.ts'));
const { connectAccount, ConnectChoiceRequired } = load(path.join(SRC, 'connect.ts'));
const { createAuthenticatorRegistry } = load(path.join(SRC, 'resolve.ts'));

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';

// A fake EIP-1193 wallet. `shared` is what the site may already see; `picks` is what the account picker answers on eth_requestAccounts.
function wallet({ shared = [], picks = [], chain = '0x1', failWith = {}, noRevoke = false } = {}) {
  const calls = [];
  const listeners = new Map();
  const provider = {
    calls,
    async request({ method, params }) {
      calls.push({ method, params });
      if (failWith[method]) throw failWith[method];
      switch (method) {
        case 'eth_accounts': return [...shared];
        case 'eth_requestAccounts': shared = [...picks]; return [...shared];
        case 'wallet_requestPermissions': shared = [...picks]; return [{ parentCapability: 'eth_accounts' }];
        case 'wallet_revokePermissions': if (noRevoke) throw Object.assign(new Error('not supported'), { code: -32601 }); shared = []; return null;
        case 'personal_sign': return '0xsig';
        case 'eth_signTypedData_v4': return '0xtyped';
        case 'eth_chainId': return chain;
        case 'wallet_switchEthereumChain': chain = params[0].chainId; return null;
        case 'eth_sendTransaction': return '0xhash';
        default: throw Object.assign(new Error('unknown ' + method), { code: -32601 });
      }
    },
    on(event, fn) { listeners.set(event, fn); },
    removeListener(event) { listeners.delete(event); },
    emit(event) { listeners.get(event)?.(); },
    has: (event) => listeners.has(event),
  };
  return provider;
}
const make = (provider) => createInjectedAuthenticator({ id: 'injected:io.metamask', label: 'MetaMask', getProvider: () => provider });

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('status: no provider means not available', async () => {
  const a = createInjectedAuthenticator({ id: 'injected:io.metamask', label: 'MetaMask', getProvider: () => undefined });
  assert.deepEqual(await a.status(), { available: false, unlocked: false });
});
await test('status: a provider with no shared account is available but not unlocked; with one it is unlocked', async () => {
  assert.deepEqual(await make(wallet()).status(), { available: true, unlocked: false });
  assert.deepEqual(await make(wallet({ shared: [A] })).status(), { available: true, unlocked: true });
});
await test('connect stays the ordinary request even when accounts are already shared; selectAccounts asks again (wallet_requestPermissions) so the person can change the set (Add Account(s))', async () => {
  const w0 = wallet({ shared: [A], picks: [A, B] });
  await make(w0).connect();
  assert.ok(!w0.calls.some((c) => c.method === 'wallet_requestPermissions'));
  const w = wallet({ shared: [A], picks: [A, B] }); const a = make(w);
  assert.deepEqual((await a.selectAccounts()).map((x) => x.address), [A, B]);
  assert.ok(w.calls.some((c) => c.method === 'wallet_requestPermissions'));
  assert.ok(!w.calls.some((c) => c.method === 'eth_requestAccounts'));
});
await test('accounts: eth_accounts, no popup; connect: eth_requestAccounts, the wallet picks the accounts', async () => {
  const w = wallet({ shared: [], picks: [A, B] }); const a = make(w);
  assert.deepEqual(await a.accounts(), []);
  assert.deepEqual((await a.connect()).map((x) => x.address), [A, B]);
  assert.deepEqual(w.calls.map((c) => c.method), ['eth_accounts', 'eth_requestAccounts']);
});
await test('signMessage: personal_sign with the message as UTF-8 hex and the address', async () => {
  const w = wallet({ shared: [A] }); const sig = await make(w).signMessage(A, 'Sign in ✓');
  assert.equal(sig, '0xsig');
  const call = w.calls.find((c) => c.method === 'personal_sign');
  assert.equal(call.params[1], A);
  assert.equal(Buffer.from(call.params[0].slice(2), 'hex').toString('utf8'), 'Sign in ✓');
});
await test('a rejection in the wallet popup (4001) becomes user_rejected', async () => {
  const w = wallet({ failWith: { personal_sign: Object.assign(new Error('User rejected the request.'), { code: 4001 }) } });
  await assert.rejects(make(w).signMessage(A, 'x'), (e) => e instanceof AuthenticatorError && e.code === 'user_rejected' && e.authenticatorId === 'injected:io.metamask');
});
await test('the provider error codes map to the wallet error set; unknown errors pass through unchanged', () => {
  const t = (code) => translateProviderError(Object.assign(new Error('m'), { code }), 'injected:io.metamask', 'MetaMask');
  assert.equal(t(4100).code, 'unauthorized'); assert.equal(t(4900).code, 'unreachable'); assert.equal(t(4901).code, 'unreachable');
  assert.equal(t(4902).code, 'wrong_chain'); assert.equal(t(-32002).code, 'locked');
  const odd = new Error('boom'); assert.equal(translateProviderError(odd, 'x', 'X'), odd);
});
await test('sendTransaction: the wallet is moved to the right network first, then eth_sendTransaction', async () => {
  const w = wallet({ shared: [A], chain: '0x1' });
  const r = await make(w).sendTransaction({ from: A, to: B, value: 5n, chainId: 31337 });
  assert.deepEqual(r, { hash: '0xhash' });
  assert.deepEqual(w.calls.map((c) => c.method), ['eth_chainId', 'wallet_switchEthereumChain', 'eth_sendTransaction']);
  assert.equal(w.calls[2].params[0].value, '0x5');
});
await test('sendTransaction: already on the right network, no switch', async () => {
  const w = wallet({ shared: [A], chain: '0x7a69' });
  await make(w).sendTransaction({ from: A, to: B, chainId: 31337 });
  assert.equal(w.calls.some((c) => c.method === 'wallet_switchEthereumChain'), false);
});
await test('disconnect: revokes the site permission; a wallet that cannot revoke is not a failure', async () => {
  const w = wallet({ shared: [A] }); await make(w).disconnect(); assert.deepEqual(await make(w).accounts(), []);
  await make(wallet({ shared: [A], noRevoke: true })).disconnect();
});
await test('disconnect: a real error from the wallet is not hidden', async () => {
  const w = wallet({ failWith: { wallet_revokePermissions: Object.assign(new Error('nope'), { code: 4001 }) } });
  await assert.rejects(make(w).disconnect(), (e) => e.code === 'user_rejected');
});
await test('onChange: accountsChanged and chainChanged reach the listener; unsubscribing removes them', async () => {
  const w = wallet(); const a = make(w); const seen = [];
  const off = a.onChange((c) => seen.push(c)); await new Promise((r) => setTimeout(r, 0));
  w.emit('accountsChanged'); w.emit('chainChanged'); assert.deepEqual(seen, ['accountsChanged', 'chainChanged']);
  off(); assert.equal(w.has('accountsChanged'), false);
});
await test('with connectAccount: connecting MetaMask through its popup makes the picked account active and records MetaMask', async () => {
  const w = wallet({ shared: [], picks: [B] }); const registry = createAuthenticatorRegistry(); registry.register(make(w));
  const log = {}; const host = { setActiveAccount: (x) => { log.active = x; }, setActiveAuthenticator: (x, id) => { log.id = [x, id]; }, clearActiveAccount: () => {} };
  const r = await connectAccount({ registry, approverId: 'injected:io.metamask', host });
  assert.deepEqual(r, { address: B, approverId: 'injected:io.metamask' }); assert.equal(log.active, B); assert.deepEqual(log.id, [B, 'injected:io.metamask']);
});
await test('with connectAccount: several MetaMask accounts shared -> the user must choose; a rejected popup changes nothing', async () => {
  const registry = createAuthenticatorRegistry(); registry.register(make(wallet({ picks: [A, B] })));
  const host = { setActiveAccount: () => { throw new Error('must not be called'); }, clearActiveAccount: () => {} };
  await assert.rejects(connectAccount({ registry, approverId: 'injected:io.metamask', host }), (e) => e instanceof ConnectChoiceRequired && e.accounts.length === 2);
  const r2 = createAuthenticatorRegistry(); r2.register(make(wallet({ failWith: { eth_requestAccounts: Object.assign(new Error('rejected'), { code: 4001 }) } })));
  await assert.rejects(connectAccount({ registry: r2, approverId: 'injected:io.metamask', host }), (e) => e.code === 'user_rejected');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
