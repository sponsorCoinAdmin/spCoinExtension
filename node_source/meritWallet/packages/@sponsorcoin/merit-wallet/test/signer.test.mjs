// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/signer.test.mjs
//
// Tests for the approval queue (src/vault/approvals.ts) and the local signer (src/vault/localSigner.ts). Run: node test/signer.test.mjs
// Transactions go to an in-memory fake chain (viem custom transport) that records the raw transaction it is given.
// MUTANT=autoApprove / MUTANT=noDevGuard run against a deliberately broken copy and must report failures.
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
  if (name === 'approvals' && process.env.MUTANT === 'autoApprove') src = src.replace('this.emit();\n    });\n  }\n\n  list()', 'this.emit();\n      void this.approve(id);\n    });\n  }\n\n  list()');
  if (name === 'localSigner' && process.env.MUTANT === 'noDevGuard') src = src.split('if (devOrigin && request.chainId !== HARDHAT_CHAIN_ID) throw new DevAccountOnRealChainError();').join('');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  cache.set(name, m);
  const localReq = (spec) => (spec.startsWith('./') ? load(spec.slice(2)) : req(spec));
  new Function('require', 'module', 'exports', js)(localReq, m, m.exports);
  return m.exports;
}
const { VaultSession, VaultLockedError } = load('vaultSession');
const { WalletAccounts, createWallet, HARDHAT_DEV_MNEMONIC } = load('walletAccounts');
const { ApprovalController, ApprovalRejectedError } = load('approvals');
const { LocalSigner, DevAccountOnRealChainError } = load('localSigner');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; }
const tick = () => new Promise((r) => setTimeout(r, 5));

// A fake chain: records raw transactions, answers the calls viem makes while preparing one.
function fakeChain() {
  const sent = [];
  const transport = viem.custom({
    request: async ({ method, params }) => {
      switch (method) {
        case 'eth_chainId': return '0x7a69';
        case 'eth_getTransactionCount': return '0x5';
        case 'eth_estimateGas': return '0x5208';
        case 'eth_gasPrice': return '0x3b9aca00';
        case 'eth_maxPriorityFeePerGas': return '0x3b9aca00';
        case 'eth_getBlockByNumber': return { number: '0x1', baseFeePerGas: '0x3b9aca00', timestamp: '0x1', hash: '0x' + '11'.repeat(32), parentHash: '0x' + '00'.repeat(32), transactions: [], gasLimit: '0x1c9c380', gasUsed: '0x0', miner: '0x' + '00'.repeat(20), nonce: '0x0000000000000000', difficulty: '0x0', totalDifficulty: '0x0', size: '0x1', extraData: '0x', logsBloom: '0x' + '00'.repeat(256), receiptsRoot: '0x' + '00'.repeat(32), sha3Uncles: '0x' + '00'.repeat(32), stateRoot: '0x' + '00'.repeat(32), transactionsRoot: '0x' + '00'.repeat(32), uncles: [] };
        case 'eth_sendRawTransaction': sent.push(params[0]); return viem.keccak256(params[0]);
        default: throw new Error('fake chain: unexpected ' + method);
      }
    },
  });
  return { sent, transport };
}

async function setup(mnemonic) {
  const s = new VaultSession({ storage: memStorage(), iterations: 1000 });
  const acc = new WalletAccounts(s);
  const r = await createWallet(s, 'password-1', mnemonic ? { mnemonic } : {});
  const approvals = new ApprovalController();
  const chain = fakeChain();
  const signer = new LocalSigner({ session: s, accounts: acc, approvals, rpcUrlFor: (id) => (id === 1 || id === 31337 ? 'http://rpc.invalid' : undefined), transportFor: () => chain.transport });
  return { s, acc, approvals, chain, signer, address: r.address };
}
const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

await test('a request waits: nothing is signed until approve, then the signature recovers to the account', async () => {
  const { approvals, signer, address } = await setup();
  let settled = false;
  const p = signer.signMessage({ address, message: 'hi', origin: 'https://dapp.example' }).then((x) => { settled = true; return x; });
  await tick();
  assert.equal(settled, false);
  const pending = approvals.list();
  assert.equal(pending.length, 1); assert.equal(pending[0].kind, 'sign'); assert.equal(pending[0].origin, 'https://dapp.example');
  await approvals.approve(pending[0].id);
  const sig = await p;
  assert.equal(await viem.recoverMessageAddress({ message: 'hi', signature: sig }), address);
  assert.equal(approvals.list().length, 0);
});

await test('reject: the caller gets ApprovalRejectedError and no signature exists', async () => {
  const { approvals, signer, address } = await setup();
  const p = signer.signMessage({ address, message: 'hi' });
  approvals.reject(approvals.list()[0].id, 'no thanks');
  await assert.rejects(p, ApprovalRejectedError);
  assert.equal(approvals.list().length, 0);
});

await test('transaction: queued, then approve signs and broadcasts exactly one raw tx from the account', async () => {
  const { approvals, signer, chain, address } = await setup(HARDHAT_DEV_MNEMONIC);
  assert.equal(address, HH0);
  const p = signer.sendTransaction({ from: address, to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 1000n, chainId: 31337 });
  await tick();
  assert.equal(chain.sent.length, 0);
  assert.equal(approvals.list()[0].kind, 'transaction');
  await approvals.approve(approvals.list()[0].id);
  const { hash } = await p;
  assert.equal(chain.sent.length, 1);
  assert.equal(hash, viem.keccak256(chain.sent[0]));
  const tx = viem.parseTransaction(chain.sent[0]);
  assert.equal(tx.to.toLowerCase(), '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'); assert.equal(tx.value, 1000n); assert.equal(tx.chainId, 31337);
  assert.equal((await viem.recoverTransactionAddress({ serializedTransaction: chain.sent[0] })), HH0);
});

await test('dev-origin (Hardhat) account is refused on a real chain BEFORE it is queued; allowed on 31337', async () => {
  const { approvals, signer, chain, address } = await setup(HARDHAT_DEV_MNEMONIC);
  assert.throws(() => signer.sendTransaction({ from: address, to: HH0, value: 1n, chainId: 1 }), DevAccountOnRealChainError);
  assert.equal(approvals.list().length, 0); assert.equal(chain.sent.length, 0);
  const p = signer.sendTransaction({ from: address, to: HH0, value: 1n, chainId: 31337 });
  assert.equal(approvals.list().length, 1);
  approvals.reject(approvals.list()[0].id); await assert.rejects(p);
});

await test('a normal account may send on a real chain; an unconfigured chain with no transport override is refused', async () => {
  const { approvals, signer, address, s, acc } = await setup();
  const p = signer.sendTransaction({ from: address, to: HH0, value: 1n, chainId: 1 });
  await approvals.approve(approvals.list()[0].id); await p;
  const bare = new LocalSigner({ session: s, accounts: acc, approvals, rpcUrlFor: () => undefined });
  assert.throws(() => bare.sendTransaction({ from: address, to: HH0, value: 1n, chainId: 999 }), /No network is configured/);
});

await test('locked wallet: refused up front; locking while a request waits makes approval fail and sign nothing', async () => {
  const { s, approvals, signer, chain, address } = await setup();
  const p = signer.sendTransaction({ from: address, to: HH0, value: 1n, chainId: 1 });
  const id = approvals.list()[0].id;
  s.lock();
  await approvals.approve(id);
  await assert.rejects(p, VaultLockedError);
  assert.equal(chain.sent.length, 0);
  assert.throws(() => signer.signMessage({ address, message: 'x' }), VaultLockedError);
});

await test('rejectAll rejects every pending request; approving an unknown id throws; listeners fire on add and remove', async () => {
  const { approvals, signer, address } = await setup();
  let n = 0; approvals.onChange(() => { n++; });
  const a = signer.signMessage({ address, message: '1' }), b = signer.signMessage({ address, message: '2' });
  assert.equal(approvals.list().length, 2);
  approvals.rejectAll();
  await assert.rejects(a, ApprovalRejectedError); await assert.rejects(b, ApprovalRejectedError);
  assert.equal(approvals.list().length, 0); assert.equal(n, 4);
  await assert.rejects(approvals.approve('nope'), /No such pending request/);
});

await test('unknown account is refused; the pending list carries no key material', async () => {
  const { approvals, signer, acc, address } = await setup();
  assert.throws(() => signer.signMessage({ address: '0x8d581506486BC255B42D05754392573e46c34577', message: 'x' }), /not in this wallet/);
  const p = signer.signMessage({ address, message: 'x' });
  const key = acc.getSigningAccount(address).account.getHdKey ? 'hd' : '';
  const dump = JSON.stringify(approvals.list());
  assert.ok(!dump.includes('privateKey') && !dump.includes('mnemonic') && key !== 'x');
  approvals.rejectAll(); await assert.rejects(p);
});

const { HARDHAT_DEV_MNEMONIC: _unused } = load('walletAccounts');
for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
