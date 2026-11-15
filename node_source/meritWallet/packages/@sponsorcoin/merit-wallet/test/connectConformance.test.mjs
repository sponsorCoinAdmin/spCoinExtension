// File: test/connectConformance.test.mjs
//
// Conformance for connect / disconnect (docs/design/accountAuthDesign.txt section 17 item 10, the part that can run without a browser): the SAME scenarios are run through every kind of approver the wallet knows
// (a Merit Wallet whose accounts are already in the wallet, MetaMask answering through a popup, the Merit extension answering through its provider, a hardware stand-in) and must give the same outcome:
// the same active account, the same recorded approver, the same refusal, the same "nothing changed" on a failure. The approvers differ only in HOW they answer; the wallet's behaviour must not. Run: node test/connectConformance.test.mjs
// MUTANT=meritSpecialCase makes connect behave differently for one approver kind and must report failures.
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
  // an approver id that gets a different rule from every other one (what the design forbids)
  if (file.endsWith('connect.ts') && process.env.MUTANT === 'meritSpecialCase') src = src.replace('  let chosen = address;', "  if (approverId === 'serverKeystore' && !address && offered.length > 1) address = offered[0].address;\n  let chosen = address;");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { connectAccount, disconnectAccount, ConnectChoiceRequired } = load(path.join(SRC, 'connect.ts'));
const { createAuthenticatorRegistry } = load(path.join(SRC, 'resolve.ts'));
const { AuthenticatorError } = load(path.join(SRC, 'authenticator.ts'));

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';
const C = '0xcccc000000000000000000000000000000000003';

// How each kind of approver answers. `held` = accounts it already holds; `popup` = what its connect() answers (when it has one); `canDisconnect` = whether it can revoke.
const KINDS = {
  serverKeystore: { id: 'serverKeystore', style: 'inWallet' },
  metamask: { id: 'injected:io.metamask', style: 'popup', canDisconnect: true },
  extension: { id: 'injected:org.sponsorcoin.merit', style: 'popup', canDisconnect: false },
  hardware: { id: 'hardware:ledger', style: 'popup', canDisconnect: false },
};
function approver(kind, accounts, { available = true } = {}) {
  const state = { connects: 0 };
  const a = {
    id: kind.id, label: kind.id, capabilities: {},
    status: async () => ({ available, unlocked: true }),
    accounts: async () => (kind.style === 'inWallet' ? accounts : []).map((address) => ({ address })),
    signMessage: async () => '0x', sendTransaction: async () => ({ hash: '0x1' }), onChange: () => () => {}, state,
  };
  if (kind.style === 'popup') a.connect = async () => { state.connects++; return accounts.map((address) => ({ address })); };
  if (kind.canDisconnect) a.disconnect = async () => undefined;
  return a;
}
const host = () => {
  const log = { active: 'KEEP', authenticator: {}, notes: [] };
  return {
    log,
    setActiveAccount: (address) => { log.active = address; },
    setActiveAuthenticator: (address, id) => { log.authenticator[address] = id; },
    clearActiveAccount: () => { log.active = undefined; },
    notify: (level, message) => log.notes.push(level),
  };
};
const registryOf = (a) => { const r = createAuthenticatorRegistry(); r.register(a); return r; };
const outcome = async (fn) => { try { const r = await fn(); return { ok: true, r }; } catch (e) { return { ok: false, kind: e instanceof ConnectChoiceRequired ? 'choice' : e instanceof AuthenticatorError ? e.code : 'other', n: e.accounts?.length }; } };

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

for (const [name, kind] of Object.entries(KINDS)) {
  await test(`${name}: one account, none chosen -> that account is connected and its approver recorded`, async () => {
    const h = host(); const r = await outcome(() => connectAccount({ registry: registryOf(approver(kind, [A])), approverId: kind.id, host: h }));
    assert.deepEqual(r, { ok: true, r: { address: A, approverId: kind.id } }); assert.equal(h.log.active, A); assert.equal(h.log.authenticator[A], kind.id);
  });
  await test(`${name}: several accounts, none chosen -> the user must choose (nothing changes)`, async () => {
    const h = host(); const r = await outcome(() => connectAccount({ registry: registryOf(approver(kind, [A, B, C])), approverId: kind.id, host: h }));
    assert.deepEqual(r, { ok: false, kind: 'choice', n: 3 }); assert.equal(h.log.active, 'KEEP');
  });
  await test(`${name}: several accounts, one chosen -> exactly that account is connected`, async () => {
    const h = host(); const r = await outcome(() => connectAccount({ registry: registryOf(approver(kind, [A, B, C])), approverId: kind.id, address: B, host: h }));
    assert.deepEqual(r, { ok: true, r: { address: B, approverId: kind.id } }); assert.equal(h.log.active, B);
  });
  await test(`${name}: an account it does not hold is refused as unauthorized (nothing changes)`, async () => {
    const h = host(); const r = await outcome(() => connectAccount({ registry: registryOf(approver(kind, [A])), approverId: kind.id, address: C, host: h }));
    assert.deepEqual(r, { ok: false, kind: 'unauthorized', n: undefined }); assert.equal(h.log.active, 'KEEP');
  });
  await test(`${name}: unreachable -> "unreachable", the user is told, nothing changes`, async () => {
    const h = host(); const r = await outcome(() => connectAccount({ registry: registryOf(approver(kind, [A], { available: false })), approverId: kind.id, address: A, host: h }));
    assert.deepEqual(r, { ok: false, kind: 'unreachable', n: undefined }); assert.equal(h.log.active, 'KEEP'); assert.deepEqual(h.log.notes, ['error']);
  });
  await test(`${name}: disconnect clears the active account whatever the approver can revoke`, async () => {
    const h = host(); h.log.active = A; await disconnectAccount({ registry: registryOf(approver(kind, [A])), approverId: kind.id, host: h });
    assert.equal(h.log.active, undefined);
  });
}
await test('all approver kinds give the identical outcome for every scenario (no approver is special)', async () => {
  const scenarios = [
    (k) => connectAccount({ registry: registryOf(approver(k, [A])), approverId: k.id, host: host() }),
    (k) => connectAccount({ registry: registryOf(approver(k, [A, B])), approverId: k.id, host: host() }),
    (k) => connectAccount({ registry: registryOf(approver(k, [A, B])), approverId: k.id, address: A, host: host() }),
    (k) => connectAccount({ registry: registryOf(approver(k, [A])), approverId: k.id, address: C, host: host() }),
  ];
  for (const run of scenarios) {
    const shapes = [];
    for (const k of Object.values(KINDS)) { const o = await outcome(() => run(k)); shapes.push(JSON.stringify(o.ok ? { ok: true, address: o.r.address } : { ok: false, kind: o.kind, n: o.n })); }
    assert.equal(new Set(shapes).size, 1, 'the approvers disagreed: ' + shapes.join(' | '));
  }
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
