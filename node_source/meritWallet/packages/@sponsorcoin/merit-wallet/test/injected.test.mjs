// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/injected.test.mjs
//
// Tests for the page-side wallet API (src/provider/injectedWallet.ts): EIP-6963 discovery and EIP-1193 calls against a fake page.
// Run: node test/injected.test.mjs. MUTANT=wrongRdns / MUTANT=noHexMessage run against a broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'provider', 'injectedWallet.ts'), 'utf8');
if (process.env.MUTANT === 'wrongRdns') src = src.replace("d.info.rdns === MERIT_RDNS", "true");
if (process.env.MUTANT === 'noHexMessage') src = src.replace("params: [utf8Hex(message), address]", "params: [message, address]");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { MERIT_RDNS, discoverWallets, findMeritWallet, createInjectedWalletApi } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

// A page with some wallets that announce themselves when asked, like real ones.
function page(wallets) {
  const win = new EventTarget();
  win.addEventListener('eip6963:requestProvider', () => {
    for (const w of wallets) win.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: w }));
  });
  return win;
}
const wallet = (rdns, uuid, provider = { request: async () => null }) => ({ info: { uuid, name: rdns, icon: '', rdns }, provider });

await test('discovery finds every announced wallet once; the Merit wallet is picked out by rdns; none installed gives null', async () => {
  const merit = wallet(MERIT_RDNS, 'm-1'), other = wallet('io.metamask', 'x-1');
  const win = page([other, merit, merit]);
  assert.equal((await discoverWallets(win, 20)).length, 2);
  assert.equal((await findMeritWallet(win, 20)).info.uuid, 'm-1');
  assert.equal(await findMeritWallet(page([other]), 20), null);
  assert.equal(await findMeritWallet(page([]), 20), null);
});

await test('connect / accounts / chainId / switchChain issue the right EIP-1193 calls and decode the answers', async () => {
  const calls = [];
  const provider = { request: async (a) => { calls.push(a); return { eth_requestAccounts: ['0xabc'], eth_accounts: ['0xabc'], eth_chainId: '0x7a69', wallet_switchEthereumChain: null }[a.method]; } };
  const api = createInjectedWalletApi(provider);
  assert.deepEqual(await api.connect(), ['0xabc']); assert.deepEqual(await api.accounts(), ['0xabc']);
  assert.equal(await api.chainId(), 31337);
  await api.switchChain(137);
  assert.deepEqual(calls.map((c) => c.method), ['eth_requestAccounts', 'eth_accounts', 'eth_chainId', 'wallet_switchEthereumChain']);
  assert.deepEqual(calls[3].params, [{ chainId: '0x89' }]);
});

await test('signMessage sends the text as hex bytes in personal_sign order; sendTransaction sends hex wei and only the fields given', async () => {
  const calls = [];
  const api = createInjectedWalletApi({ request: async (a) => { calls.push(a); return '0xresult'; } });
  assert.equal(await api.signMessage('0xabc', 'hi ✓'), '0xresult');
  assert.deepEqual(calls[0], { method: 'personal_sign', params: ['0x686920e29c93', '0xabc'] });
  await api.sendTransaction({ from: '0xabc', to: '0xdef', value: 1000n });
  assert.deepEqual(calls[1], { method: 'eth_sendTransaction', params: [{ from: '0xabc', to: '0xdef', value: '0x3e8' }] });
  await api.sendTransaction({ from: '0xabc', data: '0x12' });
  assert.deepEqual(calls[2].params[0], { from: '0xabc', data: '0x12' });
});

await test('a rejected request keeps the wallet error code; events decode and can be unsubscribed', async () => {
  const handlers = new Map();
  const provider = {
    request: async () => { throw Object.assign(new Error('User rejected the request.'), { code: 4001 }); },
    on: (e, h) => handlers.set(e, h), removeListener: (e) => handlers.delete(e),
  };
  const api = createInjectedWalletApi(provider);
  await assert.rejects(api.connect(), (e) => e.code === 4001);
  const seen = [];
  const off1 = api.onAccountsChanged((a) => seen.push(a)); const off2 = api.onChainChanged((c) => seen.push(c));
  handlers.get('accountsChanged')(['0x1']); handlers.get('chainChanged')('0x1');
  assert.deepEqual(seen, [['0x1'], 1]);
  off1(); off2(); assert.equal(handlers.size, 0);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
