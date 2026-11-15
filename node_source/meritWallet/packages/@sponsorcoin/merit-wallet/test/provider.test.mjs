// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/provider.test.mjs
//
// Tests for what a web page can ask the wallet (src/vault/providerController.ts, EIP-1193). Run: node test/provider.test.mjs
// MUTANT=openAccounts / MUTANT=forwardAll run against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const viem = req('viem');
const SRC = path.join(HERE, '..', 'src', 'vault');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  let src = fs.readFileSync(path.join(SRC, name + '.ts'), 'utf8');
  if (name === 'providerController' && process.env.MUTANT === 'openAccounts') src = src.replace('const granted = (await this.o.permissions.get(origin)).map(lower);\n    if (!granted.length) return [];', 'const granted = this.o.accounts.list().map((a) => lower(a.address));');
  if (name === 'providerController' && process.env.MUTANT === 'forwardAll') src = src.replace('if (FORWARDED.test(method)) return', 'if (true) return');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} }; cache.set(name, m);
  new Function('require', 'module', 'exports', js)((s) => (s.startsWith('./') ? load(s.slice(2)) : req(s)), m, m.exports);
  return m.exports;
}
const { VaultSession } = load('vaultSession');
const { WalletAccounts, createWallet, HARDHAT_DEV_MNEMONIC } = load('walletAccounts');
const { ApprovalController } = load('approvals');
const { LocalSigner } = load('localSigner');
const { ProviderController, ProviderRpcError, PROVIDER_ERROR, createMemoryPermissionStore } = load('providerController');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const tick = () => new Promise((r) => setTimeout(r, 5));
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; }

async function setup(mnemonic = HARDHAT_DEV_MNEMONIC, chain = 31337) {
  const s = new VaultSession({ storage: memStorage(), iterations: 1000 });
  const acc = new WalletAccounts(s);
  const r = await createWallet(s, 'password-1', mnemonic ? { mnemonic } : {});
  const approvals = new ApprovalController();
  const sent = [], rpcCalls = [];
  let chainId = chain;
  const transport = viem.custom({ request: async ({ method, params }) => {
    switch (method) {
      case 'eth_chainId': return '0x7a69'; case 'eth_getTransactionCount': return '0x1'; case 'eth_estimateGas': return '0x5208'; case 'eth_gasPrice': case 'eth_maxPriorityFeePerGas': return '0x3b9aca00';
      case 'eth_getBlockByNumber': return { number: '0x1', baseFeePerGas: '0x3b9aca00', timestamp: '0x1', hash: '0x' + '11'.repeat(32), parentHash: '0x' + '00'.repeat(32), transactions: [], gasLimit: '0x1c9c380', gasUsed: '0x0', miner: '0x' + '00'.repeat(20), nonce: '0x0000000000000000', difficulty: '0x0', totalDifficulty: '0x0', size: '0x1', extraData: '0x', logsBloom: '0x' + '00'.repeat(256), receiptsRoot: '0x' + '00'.repeat(32), sha3Uncles: '0x' + '00'.repeat(32), stateRoot: '0x' + '00'.repeat(32), transactionsRoot: '0x' + '00'.repeat(32), uncles: [] };
      case 'eth_sendRawTransaction': sent.push(params[0]); return viem.keccak256(params[0]);
      default: throw new Error('unexpected ' + method);
    }
  } });
  const signer = new LocalSigner({ session: s, accounts: acc, approvals, rpcUrlFor: () => 'http://rpc.invalid', transportFor: () => transport });
  const events = [];
  const pc = new ProviderController({
    session: s, accounts: acc, approvals, signer, permissions: createMemoryPermissionStore(),
    getChainId: () => chainId, setChainId: (id) => { chainId = id; }, isKnownChain: (id) => [1, 31337, 137].includes(id),
    rpc: async (id, method, params) => { rpcCalls.push([id, method, params]); return '0x10'; },
  });
  pc.onEvent((e) => events.push(e));
  return { s, acc, approvals, signer, pc, sent, rpcCalls, events, address: r.address };
}
const SITE = 'https://dapp.example', OTHER = 'https://other.example';
const connect = async (t, origin = SITE) => { const p = t.pc.handle(origin, { method: 'eth_requestAccounts' }); await tick(); await t.approvals.approve(t.approvals.list()[0].id); return p; };
const code = async (p) => { try { await p; return 'resolved'; } catch (e) { return e instanceof ProviderRpcError ? e.code : 'other:' + e.message; } };

await test('chain id is the wallet network (hex) and net_version its decimal', async () => {
  const t = await setup();
  assert.equal(await t.pc.handle(SITE, { method: 'eth_chainId' }), '0x7a69'); assert.equal(await t.pc.handle(SITE, { method: 'net_version' }), '31337');
});

await test('no accounts before the user connects the site; eth_requestAccounts waits for approval, then only that origin sees the account', async () => {
  const t = await setup();
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), []);
  let settled = false; const p = t.pc.handle(SITE, { method: 'eth_requestAccounts' }).then((x) => { settled = true; return x; });
  await tick(); assert.equal(settled, false);
  const [req0] = t.approvals.list(); assert.equal(req0.kind, 'connect'); assert.equal(req0.origin, SITE);
  await t.approvals.approve(req0.id);
  assert.deepEqual(await p, [t.address]);
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), [t.address]);
  assert.deepEqual(await t.pc.handle(OTHER, { method: 'eth_accounts' }), []);
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_requestAccounts' }), [t.address]);
  assert.equal(t.approvals.list().length, 0);
});

await test('merit_requestConnection (connecting the WALLET) is a confirmation asked every time, even for a site that already sees an account; rejecting gives 4001', async () => {
  const t = await setup();
  const p = t.pc.handle(SITE, { method: 'merit_requestConnection' }); await tick();
  const [req] = t.approvals.list(); assert.equal(req.kind, 'connect'); assert.equal(req.details.confirm, true);
  await t.approvals.approve(req.id);
  assert.deepEqual(await p, [t.address]);
  // the site already sees the account: a plain eth_requestAccounts answers at once, the wallet connection asks again
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_requestAccounts' }), [t.address]);
  const again = t.pc.handle(SITE, { method: 'merit_requestConnection' }); await tick();
  assert.equal(t.approvals.list().length, 1);
  t.approvals.reject(t.approvals.list()[0].id);
  assert.equal(await code(again), PROVIDER_ERROR.userRejected);
});

await test('rejecting a connection gives 4001; a locked wallet shows no accounts even to a connected site', async () => {
  const t = await setup();
  const p = t.pc.handle(SITE, { method: 'eth_requestAccounts' }); await tick(); t.approvals.reject(t.approvals.list()[0].id);
  assert.equal(await code(p), PROVIDER_ERROR.userRejected);
  await connect(t); t.s.lock();
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), []);
});

await test('personal_sign: refused before connect (4100); after connect it waits, then the signature recovers to the account (either param order)', async () => {
  const t = await setup();
  const hex = viem.toHex('hello dapp');
  assert.equal(await code(t.pc.handle(SITE, { method: 'personal_sign', params: [hex, t.address] })), PROVIDER_ERROR.unauthorized);
  await connect(t);
  for (const params of [[hex, t.address], [t.address, hex]]) {
    const p = t.pc.handle(SITE, { method: 'personal_sign', params }); await tick();
    const [q] = t.approvals.list(); assert.equal(q.details.message, 'hello dapp'); assert.equal(q.origin, SITE);
    await t.approvals.approve(q.id);
    assert.equal(await viem.recoverMessageAddress({ message: 'hello dapp', signature: await p }), t.address);
  }
  assert.equal(await code(t.pc.handle(SITE, { method: 'personal_sign', params: [hex, '0x0000000000000000000000000000000000000001'] })), PROVIDER_ERROR.unauthorized);
});

await test('eth_sendTransaction: needs the connected from; waits; approve broadcasts one raw tx; a dev account is refused on a real chain', async () => {
  const t = await setup();
  const tx = { from: t.address, to: t.address, value: '0x3e8' };
  assert.equal(await code(t.pc.handle(SITE, { method: 'eth_sendTransaction', params: [tx] })), PROVIDER_ERROR.unauthorized);
  await connect(t);
  const p = t.pc.handle(SITE, { method: 'eth_sendTransaction', params: [tx] }); await tick();
  assert.equal(t.sent.length, 0); await t.approvals.approve(t.approvals.list()[0].id);
  const hash = await p; assert.equal(t.sent.length, 1); assert.equal(hash, viem.keccak256(t.sent[0]));
  assert.equal(viem.parseTransaction(t.sent[0]).value, 1000n);
  await t.pc.handle(SITE, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
  assert.equal(await code(t.pc.handle(SITE, { method: 'eth_sendTransaction', params: [tx] })), PROVIDER_ERROR.unauthorized);
  assert.equal(t.approvals.list().length, 0);
  assert.equal(await code(t.pc.handle(SITE, { method: 'eth_sendTransaction', params: [{ ...tx, chainId: '0x89' }] })), PROVIDER_ERROR.invalidParams);
});

await test('eth_signTypedData_v4: signs for the connected account on the wallet chain; a different domain chain is refused', async () => {
  const t = await setup();
  await connect(t);
  const typed = { types: { EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'chainId', type: 'uint256' }], Note: [{ name: 'text', type: 'string' }] }, primaryType: 'Note', domain: { name: 'Demo', chainId: 31337 }, message: { text: 'hi' } };
  const p = t.pc.handle(SITE, { method: 'eth_signTypedData_v4', params: [t.address, JSON.stringify(typed)] }); await tick();
  await t.approvals.approve(t.approvals.list()[0].id);
  const sig = await p;
  assert.equal(await viem.recoverTypedDataAddress({ domain: typed.domain, types: { Note: typed.types.Note }, primaryType: 'Note', message: typed.message, signature: sig }), t.address);
  assert.equal(await code(t.pc.handle(SITE, { method: 'eth_signTypedData_v4', params: [t.address, JSON.stringify({ ...typed, domain: { ...typed.domain, chainId: 1 } })] })), PROVIDER_ERROR.invalidParams);
  assert.equal(await code(t.pc.handle(SITE, { method: 'eth_signTypedData_v4', params: [t.address, 'not json'] })), PROVIDER_ERROR.invalidParams);
});

await test('wallet_switchEthereumChain: unknown chain is 4902; a known one switches and emits chainChanged', async () => {
  const t = await setup();
  assert.equal(await code(t.pc.handle(SITE, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x539' }] })), PROVIDER_ERROR.unrecognizedChain);
  assert.equal(await t.pc.handle(SITE, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] }), null);
  assert.equal(await t.pc.handle(SITE, { method: 'eth_chainId' }), '0x89');
  assert.deepEqual(t.events.at(-1), { event: 'chainChanged', data: '0x89' });
});

await test('read-only methods are forwarded to the active chain RPC; signing, eth_sign and unknown methods are never forwarded', async () => {
  const t = await setup();
  assert.equal(await t.pc.handle(SITE, { method: 'eth_blockNumber' }), '0x10');
  assert.deepEqual(t.rpcCalls[0], [31337, 'eth_blockNumber', []]);
  for (const method of ['eth_sign', 'eth_signTransaction', 'debug_traceCall', 'eth_unlockAccount', 'personal_unlockAccount']) assert.equal(await code(t.pc.handle(SITE, { method })), PROVIDER_ERROR.methodNotFound, method);
  assert.equal(t.rpcCalls.length, 1);
});

await test('lock or account change notifies connected sites; revoking permissions hides the account and says so', async () => {
  const t = await setup();
  await connect(t); await connect(t, OTHER);
  t.s.lock(); await t.pc.notifyAccountsChanged();
  assert.deepEqual(t.events.filter((e) => e.event === 'accountsChanged').map((e) => [e.origin, e.data]), [[SITE, []], [OTHER, []]]);
  await t.s.unlock('password-1');
  await t.pc.handle(SITE, { method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), []);
  assert.deepEqual(await t.pc.handle(OTHER, { method: 'eth_accounts' }), [t.address]);
});

await test('merit_syncAccounts (the caller re-sends its connected list): exactly the accounts that exist here are connected, quietly, and the answer is what is connected now', async () => {
  const t = await setup();
  const second = (await t.acc.addDerived('Second')).address;
  const FOREIGN = '0x' + 'ab'.repeat(20);
  await connect(t); // the site holds the first account
  t.events.length = 0;
  const now = await t.pc.handle(SITE, { method: 'merit_syncAccounts', params: [{ connected: [second, FOREIGN] }] });
  assert.deepEqual(now, [second], 'the one that does not exist here is not connected, and the first account (not sent) is disconnected');
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), [second]);
  assert.deepEqual(t.events, [], 'no event: the caller made the change');
  assert.deepEqual(await t.pc.handle(SITE, { method: 'merit_syncAccounts', params: [{ connected: [] }] }), []);
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), []);
});

await test('merit_syncAccounts: a locked wallet is 4100 and the list must be given (-32602)', async () => {
  const t = await setup();
  assert.equal(await code(t.pc.handle(SITE, { method: 'merit_syncAccounts', params: [{}] })), PROVIDER_ERROR.invalidParams);
  t.s.lock();
  assert.equal(await code(t.pc.handle(SITE, { method: 'merit_syncAccounts', params: [{ connected: [t.address] }] })), PROVIDER_ERROR.unauthorized);
});

await test('eth_requestAccounts that carries the caller list applies it first and ALWAYS asks (the selector opens from what the caller holds)', async () => {
  const t = await setup();
  const second = (await t.acc.addDerived('Second')).address;
  await connect(t);
  const p = t.pc.handle(SITE, { method: 'eth_requestAccounts', params: [{ shared: [second] }] });
  await tick();
  assert.equal(t.approvals.list().length, 1, 'the selector request is open although the site already had an account');
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), [second], 'the caller list was applied before it opened');
  await t.approvals.approve(t.approvals.list()[0].id, { accounts: [second, t.address] });
  assert.deepEqual((await p).sort(), [second, t.address].sort());
});

await test('a wallet-level revoke disconnects every account for the site (the remote disconnects all of its accounts)', async () => {
  const t = await setup();
  await t.acc.addDerived('Second');
  await connect(t);
  await t.pc.handle(SITE, { method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
  assert.deepEqual(await t.pc.handle(SITE, { method: 'eth_accounts' }), []);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
