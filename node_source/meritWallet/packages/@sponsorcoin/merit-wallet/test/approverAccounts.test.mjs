// File: test/approverAccounts.test.mjs
//
// Tests for the per-approver account list and the controller behind it (src/wallet/approverAccounts.ts, docs/design/accountAuthDesign.txt section 17 items 6 / 7): the group per approver and its badge, a connect that fails reporting in words and never changing the
// active account, a disconnect clearing it. Run: node test/approverAccounts.test.mjs
// MUTANT=activeNotDisconnect|installWhenAvailable|unlockWhenNoLock|connectOnlyEmpty|noticeSwallowed|failChangesActive run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (file.endsWith('approverAccounts.ts')) {
    const m = process.env.MUTANT;
    const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
    // the active group's badge does nothing
    if (m === 'activeNotDisconnect') mutate('group.onActiveClick = () => input.onDisconnect(backend.id);', '');
    // an approver that IS reachable still offers Install
    if (m === 'installWhenAvailable') mutate('if (status && !status.available) {', 'if (status) {');
    // Unlock is offered for an approver that has no lock
    if (m === 'unlockWhenNoLock') mutate('status.available && !status.unlocked && backend.features.lock && host.onUnlock', 'status.available && !status.unlocked && host.onUnlock');
    // Connect is offered only when the approver cannot connect (inverted)
    if (m === 'connectOnlyEmpty') mutate('status && status.available && input.canConnect(backend.id)', 'status && status.available && !input.canConnect(backend.id)');
    // a failed connect is not reported
    if (m === 'noticeSwallowed') mutate('        onNotice(connectNoticeText(error));\n        return false;', '        return false;');
    // the account is made active before the connect is checked
    if (m === 'failChangesActive') mutate('        await connectAccount({ registry: wallet.registry, approverId, address, host: connectHost });', '        if (address) await connectHost.setActiveAccount(address);\n        await connectAccount({ registry: wallet.registry, approverId, address, host: connectHost });');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { buildApproverGroups, mergeWalletAccountEntries, createApproverController } = load(path.join(SRC, 'wallet', 'approverAccounts.ts'));
const { createAuthenticatorRegistry } = load(path.join(SRC, 'auth', 'resolve.ts'));

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';
const backend = (id, label, lock = false) => ({ id, label, name: label, badge: label, keepsKeys: false, where: '', features: { lock } });
const entry = (address, backends) => ({ address, name: 'n' + address.slice(2, 6), authenticatorId: backends[0], badge: '', backends });
const groupsFor = (over = {}) =>
  buildApproverGroups({
    backends: [backend('serverKeystore', 'Merit Wallet', true), backend('injected:io.metamask', 'MetaMask'), backend('injected:org.sponsorcoin.merit', 'Merit extension')],
    entries: [entry(A, ['serverKeystore'])],
    statuses: {
      serverKeystore: { available: true, unlocked: true },
      'injected:io.metamask': { available: true, unlocked: true },
      'injected:org.sponsorcoin.merit': { available: false, unlocked: false },
    },
    activeAddress: A,
    activeApproverId: 'serverKeystore',
    host: { installUrl: (id) => (id.startsWith('injected:org') ? 'https://store/merit' : undefined), onUnlock: () => undefined, openInstall: () => undefined },
    onConnect: () => undefined,
    onDisconnect: () => undefined,
    canConnect: (id) => id.startsWith('injected:'),
    showDisconnected: true,
    ...over,
  });

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

await test('one group per approver, the one holding the active account is ACTIVE and its badge disconnects', () => {
  let disconnected;
  const g = groupsFor({ onDisconnect: (id) => { disconnected = id; } });
  assert.deepEqual(g.map((x) => x.id), ['serverKeystore', 'injected:io.metamask', 'injected:org.sponsorcoin.merit']);
  assert.equal(g[0].isActiveSource, true);
  assert.equal(g[0].accounts[0].isActive, true);
  assert.equal(typeof g[0].onActiveClick, 'function');
  g[0].onActiveClick();
  assert.equal(disconnected, 'serverKeystore');
  assert.equal(g[1].isActiveSource, false);
});

await test('an approver that is not installed offers Install (only when the host knows where); a reachable one never does', () => {
  const g = groupsFor();
  assert.equal(g[2].connectLabel, 'Install');
  assert.notEqual(g[1].connectLabel, 'Install');
  const noUrl = groupsFor({ host: { installUrl: () => undefined } });
  assert.equal(noUrl[2].connectLabel, undefined);
});

await test('a reachable approver that holds no account offers Connect, and a click connects it', () => {
  let connected;
  const g = groupsFor({ onConnect: (id) => { connected = id; } });
  assert.equal(g[1].connectLabel, 'Connect');
  g[1].onConnectClick();
  assert.equal(connected, 'injected:io.metamask');
});

await test('a locked approver offers Unlock only when it has a lock and the host can show one', () => {
  let unlocked;
  const g = groupsFor({
    backends: [backend('serverKeystore', 'Merit Wallet', true), backend('injected:io.metamask', 'MetaMask', false)],
    statuses: { serverKeystore: { available: true, unlocked: false }, 'injected:io.metamask': { available: true, unlocked: false } },
    activeAddress: undefined,
    activeApproverId: undefined,
    entries: [entry(A, ['serverKeystore'])],
    host: { onUnlock: (id) => { unlocked = id; } },
  });
  assert.equal(g[0].connectLabel, 'Unlock');
  g[0].onConnectClick();
  assert.equal(unlocked, 'serverKeystore');
  assert.notEqual(g[1].connectLabel, 'Unlock');
});

await test('a wallet that is not connected is not on the list: no Ledger nobody connected, no empty MetaMask; the active, the ones holding accounts and a locked one stay', () => {
  const g = groupsFor({ showDisconnected: undefined });
  assert.deepEqual(g.map((x) => x.id), ['serverKeystore']);
  const held = groupsFor({ showDisconnected: undefined, entries: [entry(A, ['serverKeystore']), entry(B, ['injected:io.metamask'])] });
  assert.deepEqual(held.map((x) => x.id), ['serverKeystore', 'injected:io.metamask']);
  const locked = groupsFor({ showDisconnected: undefined, statuses: { serverKeystore: { available: true, unlocked: false }, 'injected:io.metamask': { available: true, unlocked: true } }, activeAddress: undefined, activeApproverId: undefined });
  assert.deepEqual(locked.map((x) => x.id), ['serverKeystore']);
  assert.equal(locked[0].connectLabel, 'Unlock');
});

await test('the NATIVE wallet is listed first and is always connected (never Install / Connect / Unlock, even locked or unavailable); only CONNECTED wallets are listed, by the host\'s one definition; inactive accounts are fine', () => {
  const base = { showDisconnected: undefined, host: { nativeWalletId: 'injected:io.metamask', installUrl: () => 'https://store', onUnlock: () => undefined } };
  // the native wallet is not the first backend and is unavailable: it still comes first, with no connect badge
  const g = groupsFor({ ...base, statuses: { serverKeystore: { available: true, unlocked: true }, 'injected:io.metamask': { available: false, unlocked: false }, 'injected:org.sponsorcoin.merit': { available: false, unlocked: false } }, activeAddress: A, activeApproverId: 'serverKeystore' });
  assert.equal(g[0].id, 'injected:io.metamask');
  assert.equal(g[0].connectLabel, undefined);
  // the host says which others are connected: only those (and the native one and the active one) are listed, empty or not
  const only = groupsFor({ ...base, host: { ...base.host, isConnected: (id) => id === 'injected:org.sponsorcoin.merit' } });
  assert.deepEqual(only.map((x) => x.id), ['injected:io.metamask', 'serverKeystore', 'injected:org.sponsorcoin.merit']);
  // a wallet the host calls NOT connected is not listed even when it holds accounts
  const hidden = groupsFor({ ...base, host: { ...base.host, isConnected: () => false }, entries: [entry(A, ['serverKeystore']), entry(B, ['injected:org.sponsorcoin.merit'])] });
  assert.deepEqual(hidden.map((x) => x.id), ['injected:io.metamask', 'serverKeystore']);
});

await test('a wallet label is "Name,Symbol": split at the comma; a missing half comes from the public profile, else N/A (never the name copied into the symbol)', () => {
  const rowOf = (name, describeAccount) => groupsFor({ entries: [{ ...entry(A, ['serverKeystore']), name }], host: { describeAccount } })[0].accounts[0];
  const pub = () => ({ name: 'Public Name', symbol: 'PUB' });
  assert.deepEqual([rowOf('Ollie Wog Super Dog,HH10_Ollie', pub).name, rowOf('Ollie Wog Super Dog,HH10_Ollie', pub).symbol], ['Ollie Wog Super Dog', 'HH10_Ollie']);
  assert.deepEqual([rowOf('Ollie Wog Super Dog', pub).name, rowOf('Ollie Wog Super Dog', pub).symbol], ['Ollie Wog Super Dog', 'PUB']);
  assert.deepEqual([rowOf(',HH10', pub).name, rowOf(',HH10', pub).symbol], ['Public Name', 'HH10']);
  assert.deepEqual([rowOf('Only Name', undefined).name, rowOf('Only Name', undefined).symbol], ['Only Name', 'N/A']);
  assert.deepEqual([rowOf('', undefined).name, rowOf('', undefined).symbol], ['N/A', 'N/A']);
});
await test('an account held by two approvers shows in both groups, active only where it is the active approver', () => {
  const g = groupsFor({ entries: [entry(A, ['serverKeystore', 'injected:io.metamask'])] });
  assert.equal(g[0].accounts.length, 1);
  assert.equal(g[1].accounts.length, 1);
  assert.equal(g[0].accounts[0].isActive, true);
  assert.equal(g[1].accounts[0].isActive, false);
});

await test('an account held by two wallets carries no "Key also in ..." note in either list (owner request 2026-10-31)', () => {
  const g = groupsFor({ entries: [entry(A, ['serverKeystore', 'injected:io.metamask']), entry(B, ['serverKeystore'])] });
  const inKeystore = g[0].accounts;
  assert.equal(inKeystore.find((a) => a.address === A).note, undefined);
  assert.equal(inKeystore.find((a) => a.address === B).note, undefined);
  assert.equal(g[1].accounts[0].note, undefined);
});

await test('host account entries and backend-listed entries merge case-insensitively without mutating either source', () => {
  const hostEntries = [entry(A, ['serverKeystore'])];
  const listed = [entry(A.toLowerCase(), ['injected:io.metamask']), entry(B, ['serverKeystore'])];
  const merged = mergeWalletAccountEntries(hostEntries, listed);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].backends, ['serverKeystore', 'injected:io.metamask']);
  assert.equal(merged[0].address, A);
  assert.deepEqual(hostEntries[0].backends, ['serverKeystore']);
  assert.deepEqual(listed[0].backends, ['injected:io.metamask']);
});

const fakeApprover = (id, { available = true, accounts = [] } = {}) => ({ id, label: id, capabilities: {}, status: async () => ({ available, unlocked: true }), accounts: async () => accounts, onChange: () => () => undefined });
const wallet = (approvers) => {
  const registry = createAuthenticatorRegistry();
  approvers.forEach((a) => registry.register(a));
  const saved = {};
  return { registry, setActiveAuthenticator: (a, id) => { saved[a] = id; }, backendIdFor: (a) => saved[a], saved };
};

await test('connecting an account makes it active and records its approver; success answers true', async () => {
  const w = wallet([fakeApprover('serverKeystore', { accounts: [{ address: A }] })]);
  const calls = [];
  const c = createApproverController(w, { setActiveAccount: (a) => calls.push(['active', a]), clearActiveAccount: () => calls.push(['clear']) }, (t) => calls.push(['notice', t]), () => undefined);
  assert.equal(await c.connect('serverKeystore', A), true);
  assert.deepEqual(calls.filter((x) => x[0] === 'active'), [['active', A]]);
  assert.equal(w.saved[A], 'serverKeystore');
});

await test('an unreachable approver is reported in words, answers false and changes nothing', async () => {
  const w = wallet([fakeApprover('injected:io.metamask', { available: false, accounts: [{ address: B }] })]);
  const calls = [];
  const c = createApproverController(w, { setActiveAccount: (a) => calls.push(['active', a]), clearActiveAccount: () => calls.push(['clear']) }, (t) => calls.push(['notice', t]), () => undefined);
  assert.equal(await c.connect('injected:io.metamask', B), false);
  assert.equal(calls.some((x) => x[0] === 'active'), false);
  const notices = calls.filter((x) => x[0] === 'notice' && x[1]).map((x) => x[1]);
  assert.ok(notices.length >= 1 && /not reachable|not available/.test(notices[notices.length - 1]), notices.join(' | '));
});

await test('a host that fails to make the account active is reported in words too (the connect checks passed, so nothing else told the user)', async () => {
  const w = wallet([fakeApprover('serverKeystore', { accounts: [{ address: A }] })]);
  const notices = [];
  const c = createApproverController(w, { setActiveAccount: () => { throw new Error('the wallet is busy'); }, clearActiveAccount: () => undefined }, (t) => notices.push(t), () => undefined);
  assert.equal(await c.connect('serverKeystore', A), false);
  assert.ok(notices.some((t) => /busy/.test(t)), notices.join(' | '));
});

await test('an account the approver does not hold is refused and the active account is untouched', async () => {
  const w = wallet([fakeApprover('serverKeystore', { accounts: [{ address: A }] })]);
  const calls = [];
  const c = createApproverController(w, { setActiveAccount: (a) => calls.push(['active', a]), clearActiveAccount: () => undefined }, (t) => calls.push(['notice', t]), () => undefined);
  assert.equal(await c.connect('serverKeystore', B), false);
  assert.equal(calls.some((x) => x[0] === 'active'), false);
});

await test('disconnect clears the active account (a failed permission revoke never blocks it)', async () => {
  const approver = { ...fakeApprover('injected:io.metamask', { accounts: [{ address: A }] }), disconnect: async () => { throw new Error('revoke refused'); } };
  const w = wallet([approver]);
  w.saved[A] = 'injected:io.metamask';
  const calls = [];
  const c = createApproverController(w, { setActiveAccount: () => undefined, clearActiveAccount: () => calls.push('clear') }, (t) => calls.push(['notice', t]), () => A);
  await c.disconnect();
  assert.ok(calls.includes('clear'));
});

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
