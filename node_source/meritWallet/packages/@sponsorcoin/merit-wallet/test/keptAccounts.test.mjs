// File: test/keptAccounts.test.mjs
//
// Tests for withKeptAccounts (src/auth/keptAccounts.ts), the owner's design for MetaMask (2026-11-06): the accounts of an injected wallet are KEPT and PERSISTED whether it is connected or not. A wallet-level Disconnect turns EVERY known account into a disconnected one that stays
// listed (none is removed); a disconnected account is connected again either by flipping the local flag (the wallet still shares it) or through the wallet's own account picker (it does not); every state survives a reload (a new wrapper over the same store).
// Run: node test/keptAccounts.test.mjs
// MUTANT=disconnectRemoves|noRemember|connectKeepsOff|connectSkipsPicker|offStillUsable|disconnectKeepsUsable run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'auth', 'keptAccounts.ts'), 'utf8').replace(/\r\n/g, '\n');
const m = process.env.MUTANT;
const swap = (text, from, to) => {
  assert.ok(text.includes(from), 'mutant anchor missing: ' + from);
  return text.replace(from, to);
};
// a disconnect removes the accounts instead of switching them off
if (m === 'disconnectRemoves') src = swap(src, 'await save({ known, off: known });', 'await save({ known: [], off: [] });');
// accounts seen are not remembered
if (m === 'noRemember') src = swap(src, 'if (known.length !== state.known.length) await store.write({ ...state, known });\n      return listed.filter', 'return listed.filter');
// an account picked in the wallet picker stays switched off
if (m === 'connectKeepsOff') src = swap(src, 'off: without(state.off, addresses)', 'off: state.off');
// a local connect never opens the picker
if (m === 'connectSkipsPicker') src = swap(src, 'if (has(live, address)) {', 'if (true) {');
// a switched-off account is still offered as usable
if (m === 'offStillUsable') src = swap(src, 'return listed.filter((a) => !has(state.off, a.address));', 'return listed;');
// Remove does not remember the removal (the account stays listed)
if (m === 'removeKeepsListed') src = swap(src, 'removed: union(state.removed ?? [], [address]) });', 'removed: state.removed ?? [] });');
// disconnecting ONE account forgets the removed list
if (m === 'oneDisconnectForgetsRemoved') src = swap(src, 'await save({ ...state, known: union(state.known, [address]), off: union(state.off, [address]) });', 'await save({ known: union(state.known, [address]), off: union(state.off, [address]) });');
// a removed account is still listed by knownAccounts
if (m === 'removedStillListed') src = swap(src, 'const known = without(union(state.known, live), gone);', 'const known = union(state.known, live);');
// a removed account is still usable
if (m === 'removedStillUsable') src = swap(src, 'return listed.filter((a) => !has(state.off, a.address) && !has(gone, a.address));', 'return listed.filter((a) => !has(state.off, a.address));');
// an account the wallet newly shares does not come back from removed
if (m === 'freshStaysRemoved') src = swap(src, 'off: without(state.off, fresh), removed: without(state.removed ?? [], fresh) });', 'off: without(state.off, fresh), removed: state.removed ?? [] });');
// the wallet-level disconnect does not switch the accounts off
if (m === 'disconnectKeepsUsable') src = swap(src, 'await save({ known, off: known });', 'await save({ known, off: state.off });');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { withKeptAccounts } = mod.exports;

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

const A = '0xaaaa000000000000000000000000000000000001';
const B = '0xbbbb000000000000000000000000000000000002';
const C = '0xcccc000000000000000000000000000000000003';

/** A fake injected wallet: `shared` is what it reports now; `picks` is what its account picker answers; `canRevoke:false` is a wallet that ignores wallet_revokePermissions. */
function wallet({ shared = [], picks = [], canRevoke = true } = {}) {
  const w = { shared: [...shared], picks: [...picks], pickerOpened: 0, revoked: 0, listeners: new Set(), emit: async () => { w.listeners.forEach((l) => l('accountsChanged')); await new Promise((r) => setTimeout(r, 20)); } };
  w.authenticator = {
    id: 'injected:io.metamask',
    label: 'MetaMask',
    capabilities: {},
    async status() {
      return { available: true, unlocked: w.shared.length > 0 };
    },
    async accounts() {
      return w.shared.map((address) => ({ address, source: 'injected:io.metamask' }));
    },
    async connect() {
      w.pickerOpened++;
      w.shared = [...w.picks];
      return w.shared.map((address) => ({ address, source: 'injected:io.metamask' }));
    },
    async selectAccounts() {
      return this.connect();
    },
    async disconnect() {
      w.revoked++;
      if (canRevoke) w.shared = [];
    },
    onChange(listener) {
      w.listeners.add(listener);
      return () => w.listeners.delete(listener);
    },
  };
  return w;
}

/** A persisted store whose contents outlive the wrapper (a reload is a NEW wrapper over the same store). */
const memoryStore = () => {
  const box = { state: { known: [], off: [] }, writes: 0 };
  return {
    box,
    store: {
      async read() {
        return JSON.parse(JSON.stringify(box.state));
      },
      async write(state) {
        box.writes++;
        box.state = JSON.parse(JSON.stringify(state));
      },
    },
  };
};
const lower = (list) => list.map((a) => a.toLowerCase());

await test('every account the wallet reports is remembered (persisted) and offered as usable while connected', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  assert.deepEqual((await k.accounts()).map((a) => a.address), [A, B]);
  assert.deepEqual(lower(s.box.state.known), [A, B]);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: true }, { address: B, connected: true }]);
});

await test('THE WALLET-LEVEL DISCONNECT: every account becomes disconnected locally and NONE is removed; the wallet is asked to drop its permission', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  await k.disconnect();
  assert.equal(w.revoked, 1);
  assert.deepEqual(await k.accounts(), [], 'nothing is usable');
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }, { address: B, connected: false }], 'both stay listed, disconnected');
  assert.deepEqual(s.box.state, { known: [A, B], off: [A, B] }, 'and it is persisted');
});

await test('a wallet that IGNORES the revoke (it still reports its accounts) is still disconnected locally', async () => {
  const w = wallet({ shared: [A, B], canRevoke: false });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.disconnect();
  assert.equal(w.shared.length, 2, 'the wallet still reports them');
  assert.deepEqual(await k.accounts(), []);
  assert.deepEqual((await k.knownAccounts()).map((a) => a.connected), [false, false]);
});

await test('PERSISTED: a reload (a new wrapper over the same store) keeps the accounts and every state', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const first = withKeptAccounts(w.authenticator, s.store);
  await first.accounts();
  await first.setAccountConnected(B, false);
  const reloaded = withKeptAccounts(wallet({ shared: [A, B] }).authenticator, s.store);
  assert.deepEqual(await reloaded.knownAccounts(), [{ address: A, connected: true }, { address: B, connected: false }]);
  // and after a wallet-level disconnect
  await reloaded.disconnect();
  const again = withKeptAccounts(wallet({ shared: [] }).authenticator, s.store);
  assert.deepEqual(await again.knownAccounts(), [{ address: A, connected: false }, { address: B, connected: false }]);
});

await test('RECONNECT through the wallet picker: the accounts it shares are connected; the others stay listed, disconnected', async () => {
  const w = wallet({ shared: [A, B, C], picks: [A] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  await k.disconnect();
  const shared = await k.connect();
  assert.deepEqual(shared.map((a) => a.address), [A]);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: true }, { address: B, connected: false }, { address: C, connected: false }]);
  assert.deepEqual(s.box.state.off, [B, C]);
});

await test('selectAccounts (Add Account(s)) adopts what the picker shares in the same way', async () => {
  const w = wallet({ shared: [A, B], picks: [B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.disconnect();
  await k.selectAccounts();
  assert.deepEqual((await k.accounts()).map((a) => a.address), [B]);
});

await test('one account disconnected locally STAYS listed and is not usable; connecting it again flips the flag with NO picker while the wallet still shares it', async () => {
  const w = wallet({ shared: [A, B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.setAccountConnected(A, false);
  assert.deepEqual((await k.accounts()).map((a) => a.address), [B]);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }, { address: B, connected: true }]);
  await k.setAccountConnected(A, true);
  assert.equal(w.pickerOpened, 0, 'the wallet picker was not opened');
  assert.deepEqual((await k.accounts()).map((a) => a.address), [A, B]);
});

await test('connecting an account the wallet no longer shares OPENS THE PICKER; if the person does not choose it there is an error and the account stays disconnected', async () => {
  const w = wallet({ shared: [A, B], picks: [B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.disconnect();
  await assert.rejects(() => k.setAccountConnected(A, true), /did not share that account/);
  assert.equal(w.pickerOpened, 1);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }, { address: B, connected: true }], 'B was picked, A was not');
  w.picks = [A, B];
  await k.setAccountConnected(A, true);
  assert.deepEqual((await k.knownAccounts()).map((a) => a.connected), [true, true]);
});

await test('an account the wallet stops reporting (removed there) is KEPT, listed as disconnected', async () => {
  const w = wallet({ shared: [A, B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  w.shared = [A];
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: true }, { address: B, connected: false }]);
});

await test('a wallet that cannot be asked right now reads everything disconnected but removes nothing', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  w.authenticator.accounts = async () => {
    throw new Error('the wallet is not reachable');
  };
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }, { address: B, connected: false }]);
  assert.deepEqual(lower(s.box.state.known), [A, B]);
});

await test('every change tells the listeners accountsChanged (the list reloads)', async () => {
  const w = wallet({ shared: [A], picks: [A] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  const seen = [];
  const off = k.onChange((c) => seen.push(c));
  await k.setAccountConnected(A, false);
  await k.disconnect();
  await k.connect();
  assert.ok(seen.length >= 3 && seen.every((c) => c === 'accountsChanged'));
  off();
  const before = seen.length;
  await k.setAccountConnected(A, false);
  assert.equal(seen.length, before, 'unsubscribed');
});

await test('everything else of the wallet is untouched (signing, status, label)', async () => {
  const w = wallet({ shared: [A] });
  const k = withKeptAccounts({ ...w.authenticator, async signMessage() { return '0xsig'; } }, memoryStore().store);
  assert.equal(k.label, 'MetaMask');
  assert.equal(await k.signMessage(A, 'hi'), '0xsig');
  assert.deepEqual(await k.status(), { available: true, unlocked: true });
});

await test('addresses are compared case-insensitively', async () => {
  const w = wallet({ shared: [A.toUpperCase().replace('0X', '0x')] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.setAccountConnected(A, false);
  assert.deepEqual((await k.accounts()), []);
  assert.equal((await k.knownAccounts()).length, 1, 'one account, not two');
});

await test('REMOVE (2026-11-08): the account leaves the list and the usable accounts, goes on the removed list, and the wallet is NOT touched', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  await k.removeAccount(A);
  assert.deepEqual(await k.knownAccounts(), [{ address: B, connected: true }], 'A is not listed');
  assert.deepEqual((await k.accounts()).map((a) => a.address), [B], 'A is not usable');
  assert.deepEqual(lower(s.box.state.removed), [A]);
  assert.equal(w.revoked, 0, 'the wallet was not asked to disconnect');
  assert.deepEqual(w.shared, [A, B], 'it still shares both');
});

await test('a removed account STAYS removed across a reload and while the wallet still shares it (an update does not bring it back)', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  await withKeptAccounts(w.authenticator, s.store).removeAccount(A);
  const reloaded = withKeptAccounts(w.authenticator, s.store);
  assert.deepEqual((await reloaded.knownAccounts()).map((a) => a.address), [B]);
  await w.emit();
  assert.deepEqual((await reloaded.knownAccounts()).map((a) => a.address), [B], 'still removed after an accountsChanged that adds nothing');
});

await test('a removed account RETURNS when the wallet newly starts sharing it', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  k.onChange(() => undefined);
  await k.removeAccount(A);
  w.shared = [B];
  await w.emit();
  w.shared = [A, B];
  await w.emit();
  assert.deepEqual(lower(s.box.state.removed), [], 'no longer removed');
  assert.deepEqual((await k.knownAccounts()).map((a) => a.address).sort(), [A, B]);
});

await test('a removed account RETURNS when the person connects it again (the wallet picker shares it)', async () => {
  const w = wallet({ shared: [B], picks: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  await k.removeAccount(B);
  await k.selectAccounts();
  assert.deepEqual(lower(s.box.state.removed), []);
  assert.deepEqual((await k.knownAccounts()).map((a) => a.address).sort(), [A, B]);
});

await test('Disconnect and Remove are different: a disconnected account stays listed, a removed one does not', async () => {
  const w = wallet({ shared: [A, B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.setAccountConnected(A, false);
  await k.removeAccount(B);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }]);
});

await test('the wallet-level Disconnect does not bring a removed account back', async () => {
  const w = wallet({ shared: [A, B] });
  const k = withKeptAccounts(w.authenticator, memoryStore().store);
  await k.accounts();
  await k.removeAccount(A);
  await k.disconnect();
  assert.deepEqual(await k.knownAccounts(), [{ address: B, connected: false }]);
});

await test('disconnecting ANOTHER account does not forget the removed list (the removed one stays removed)', async () => {
  const w = wallet({ shared: [A, B] });
  const s = memoryStore();
  const k = withKeptAccounts(w.authenticator, s.store);
  await k.accounts();
  await k.removeAccount(B);
  await k.setAccountConnected(A, false);
  assert.deepEqual(lower(s.box.state.removed), [B]);
  assert.deepEqual(await k.knownAccounts(), [{ address: A, connected: false }]);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
