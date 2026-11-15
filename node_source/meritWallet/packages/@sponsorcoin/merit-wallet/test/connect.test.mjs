// File: test/connect.test.mjs
//
// Tests for connect / disconnect (src/auth/connect.ts, docs/design/accountAuthDesign.txt section 17 items 3 and 5). Run: node test/connect.test.mjs
// MUTANT=mutateBeforeCheck|skipChoice|noMembership|setAccountBeforeAuthenticator|disconnectStrict|silentReach run against deliberately broken copies and must report failures.
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
  if (file.endsWith('connect.ts')) {
    const m = process.env.MUTANT;
    // the account becomes active before the membership check: a failed connect would already have changed the active account
    if (m === 'mutateBeforeCheck') src = src.replace('  let chosen = address;', '  if (address) await host.setActiveAccount(address);\n  let chosen = address;');
    // several accounts and none chosen: silently take the first
    if (m === 'skipChoice') src = src.replace('if (offered.length > 1) throw new ConnectChoiceRequired(approverId, offered);', '');
    // any address is accepted, even one the approver did not offer
    if (m === 'noMembership') src = src.replace('if (!offered.some((a) => same(a.address, chosen as string))) {', 'if (false) {');
    // the account is made active before the approver is recorded
    if (m === 'setAccountBeforeAuthenticator') src = src.replace('  await host.setActiveAuthenticator?.(chosen, approverId);\n  await host.setActiveAccount(chosen);', '  await host.setActiveAccount(chosen);\n  await host.setActiveAuthenticator?.(chosen, approverId);');
    // a failed permission revoke blocks the disconnect
    if (m === 'disconnectStrict') src = src.replace("      host.notify?.('warning', error instanceof Error ? `${authenticator.label}: ${error.message}` : `${authenticator.label} could not revoke its permission.`);", '      throw error;');
    // an unreachable approver is not reported to the user
    if (m === 'silentReach') src = src.replace("    host.notify?.('error', error.message);\n    throw error;\n  }\n  return authenticator;", '    throw error;\n  }\n  return authenticator;');
  }
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

// A fake approver. `accounts` is what it can sign for now; `afterConnect` is what it answers once connect() is called (a popup).
const fake = (id, { available = true, accounts = [], afterConnect, disconnect } = {}) => {
  const state = { connectCalls: 0, disconnectCalls: 0 };
  const a = {
    id, label: id, capabilities: {},
    status: async () => ({ available, unlocked: true }),
    accounts: async () => accounts.map((address) => ({ address })),
    signMessage: async () => '0x', sendTransaction: async () => ({ hash: '0x1' }), onChange: () => () => {},
    state,
  };
  if (afterConnect) a.connect = async () => { state.connectCalls++; return afterConnect.map((address) => ({ address })); };
  if (disconnect) a.disconnect = async () => { state.disconnectCalls++; return disconnect(); };
  return a;
};
const makeHost = () => {
  const log = { active: undefined, authenticator: {}, cleared: 0, notes: [], order: [] };
  return {
    log,
    setActiveAccount: (address) => { log.active = address; log.order.push('account'); },
    setActiveAuthenticator: (address, id) => { log.authenticator[address] = id; log.order.push('authenticator'); },
    clearActiveAccount: () => { log.active = undefined; log.cleared++; },
    notify: (level, message) => log.notes.push([level, message]),
  };
};
const registryOf = (...authenticators) => { const r = createAuthenticatorRegistry(); authenticators.forEach((a) => r.register(a)); return r; };

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('connect: an approver that already holds the account makes it the active account and records the approver', async () => {
  const host = makeHost(); const registry = registryOf(fake('serverKeystore', { accounts: [A, B] }));
  const r = await connectAccount({ registry, approverId: 'serverKeystore', address: B, host });
  assert.deepEqual(r, { address: B, approverId: 'serverKeystore' });
  assert.equal(host.log.active, B); assert.equal(host.log.authenticator[B], 'serverKeystore');
});
await test('connect: the approver is recorded BEFORE the account becomes active (signing is ready the moment it is active)', async () => {
  const host = makeHost(); const registry = registryOf(fake('localVault', { accounts: [A] }));
  await connectAccount({ registry, approverId: 'localVault', address: A, host });
  assert.deepEqual(host.log.order, ['authenticator', 'account']);
});
await test('connect: an approver that has to be reached (MetaMask popup) is asked, and its answer is used', async () => {
  const host = makeHost(); const mm = fake('injected:io.metamask', { accounts: [], afterConnect: [C] });
  const r = await connectAccount({ registry: registryOf(mm), approverId: 'injected:io.metamask', host });
  assert.equal(mm.state.connectCalls, 1); assert.equal(r.address, C); assert.equal(host.log.active, C);
});
await test('connect: an account the approver already offers does not open the popup again', async () => {
  const host = makeHost(); const mm = fake('injected:io.metamask', { accounts: [A], afterConnect: [B] });
  await connectAccount({ registry: registryOf(mm), approverId: 'injected:io.metamask', address: A, host });
  assert.equal(mm.state.connectCalls, 0);
});
await test('connect: several accounts and none chosen throws ConnectChoiceRequired with the accounts, and changes nothing', async () => {
  const host = makeHost(); host.log.active = 'KEEP'; const registry = registryOf(fake('injected:io.metamask', { accounts: [], afterConnect: [A, B] }));
  await assert.rejects(connectAccount({ registry, approverId: 'injected:io.metamask', host }), (e) => e instanceof ConnectChoiceRequired && e.accounts.length === 2 && e.approverId === 'injected:io.metamask');
  assert.equal(host.log.active, 'KEEP'); assert.deepEqual(host.log.order, []);
});
await test('connect: an address the approver does not hold is refused, the active account is not changed, the user is told', async () => {
  const host = makeHost(); host.log.active = 'KEEP'; const registry = registryOf(fake('serverKeystore', { accounts: [A] }));
  await assert.rejects(connectAccount({ registry, approverId: 'serverKeystore', address: C, host }), (e) => e instanceof AuthenticatorError && e.code === 'unauthorized');
  assert.equal(host.log.active, 'KEEP'); assert.equal(host.log.notes[0][0], 'error');
});
await test('connect: a failed connect leaves the active account exactly as it was (the app never changes it on its own)', async () => {
  const host = makeHost(); host.log.active = 'KEEP';
  const mm = fake('injected:io.metamask', { accounts: [], afterConnect: [] }); mm.connect = async () => { throw new AuthenticatorError('user_rejected', 'Rejected in MetaMask', 'injected:io.metamask'); };
  await assert.rejects(connectAccount({ registry: registryOf(mm), approverId: 'injected:io.metamask', address: A, host }), (e) => e.code === 'user_rejected');
  assert.equal(host.log.active, 'KEEP'); assert.equal(host.log.notes.length, 1);
});
await test('connect: an approver that is not registered is "unreachable", reported, and nothing changes', async () => {
  const host = makeHost(); host.log.active = 'KEEP';
  await assert.rejects(connectAccount({ registry: registryOf(), approverId: 'injected:io.metamask', address: A, host }), (e) => e.code === 'unreachable' && e.authenticatorId === 'injected:io.metamask');
  assert.equal(host.log.active, 'KEEP'); assert.equal(host.log.notes.length, 1);
});
await test('connect: a registered approver that is not available (locked, not installed) is "unreachable" and reported', async () => {
  const host = makeHost(); const registry = registryOf(fake('injected:io.metamask', { available: false, accounts: [A] }));
  await assert.rejects(connectAccount({ registry, approverId: 'injected:io.metamask', address: A, host }), (e) => e.code === 'unreachable');
  assert.equal(host.log.notes[0][0], 'error'); assert.equal(host.log.active, undefined);
});
await test('connect: an approver that offers no account at all is "unauthorized"', async () => {
  const host = makeHost(); const registry = registryOf(fake('serverKeystore', { accounts: [] }));
  await assert.rejects(connectAccount({ registry, approverId: 'serverKeystore', host }), (e) => e.code === 'unauthorized');
});
await test('connect: address comparison ignores case', async () => {
  const host = makeHost(); const registry = registryOf(fake('serverKeystore', { accounts: [A.toUpperCase().replace('0X', '0x')] }));
  const r = await connectAccount({ registry, approverId: 'serverKeystore', address: A, host });
  assert.equal(r.address, A);
});
await test('disconnect: clears the active account and revokes the approver permission when it supports that', async () => {
  const host = makeHost(); host.log.active = A; const mm = fake('injected:io.metamask', { accounts: [A], disconnect: async () => undefined });
  await disconnectAccount({ registry: registryOf(mm), approverId: 'injected:io.metamask', host });
  assert.equal(mm.state.disconnectCalls, 1); assert.equal(host.log.active, undefined); assert.equal(host.log.cleared, 1);
});
await test('disconnect: an approver with no revoke (Merit Wallet) still clears the account', async () => {
  const host = makeHost(); host.log.active = A;
  await disconnectAccount({ registry: registryOf(fake('serverKeystore', { accounts: [A] })), approverId: 'serverKeystore', host });
  assert.equal(host.log.active, undefined);
});
await test('disconnect: a failed revoke is reported as a warning and the account is still cleared', async () => {
  const host = makeHost(); host.log.active = A;
  const mm = fake('injected:io.metamask', { accounts: [A], disconnect: async () => { throw new Error('revoke refused'); } });
  await disconnectAccount({ registry: registryOf(mm), approverId: 'injected:io.metamask', host });
  assert.equal(host.log.active, undefined); assert.equal(host.log.notes[0][0], 'warning');
});
await test('disconnect: with no approver known it just clears the active account', async () => {
  const host = makeHost(); host.log.active = A;
  await disconnectAccount({ registry: registryOf(), host });
  assert.equal(host.log.active, undefined); assert.equal(host.log.cleared, 1);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
