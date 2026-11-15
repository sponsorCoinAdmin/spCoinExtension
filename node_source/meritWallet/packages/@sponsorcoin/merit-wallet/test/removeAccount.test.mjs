// File: test/removeAccount.test.mjs
//
// 2026-11-08 (docs/design/removeAccountPlan.txt rows 3, 5, 6; rules X2, X3, X7): who holds an account (resolveAccountSource, src/account/accountSource.ts) and what the Account Details screen offers for it:
// an account only ANOTHER wallet holds reads "Held by <wallet>" and, when that wallet can remove accounts, offers "Remove from Merit"; the ACTIVE account's button is disabled; an account a vault holds (a local account) offers nothing yet.
// The screen's wiring is pinned from source. Run: node test/removeAccount.test.mjs
// MUTANT=activeRemovable|vaultRemovable|noKnownAccounts|screenNoButton run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const read = (...p) => fs.readFileSync(path.join(HERE, '..', 'src', ...p), 'utf8').replace(/\r\n/g, '\n');
const m = process.env.MUTANT;
const swap = (text, from, to) => {
  assert.ok(text.includes(from), 'mutant anchor missing: ' + from);
  return text.replace(from, to);
};
// 2026-11-10 (row 3): the REAL wallet (wallet/wallet.ts) over fake backends, so Wallet.removeAccount's path choice is tested, not faked. Each source file is loaded through transpileModule; a mutant edits one file.
const SRC = path.join(HERE, '..', 'src');
const tweaks = {
  'account/accountSource': (s) => {
    if (m === 'activeRemovable') s = swap(s, '...(same(address, activeAddress) ?', '...(false ?');
    return s;
  },
  'wallet/accountHolders': (s) => {
    if (m === 'vaultRemovable') s = swap(s, 'holders.some((a) => !!a.vault)', 'false');
    if (m === 'noKnownAccounts') s = swap(s, 'const known = authenticator.knownAccounts ? await authenticator.knownAccounts() : undefined;', 'const known = undefined;');
    return s;
  },
  'wallet/wallet': (s) => {
    if (m === 'localWithoutPassword') s = swap(s, "if (!options.credential) throw new Error('The wallet password is required.');", '');
    return s;
  },
};
const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel).exports;
  let src = fs.readFileSync(path.join(SRC, rel + '.ts'), 'utf8').replace(/\r\n/g, '\n');
  if (tweaks[rel]) src = tweaks[rel](src);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(rel, mod);
  const dir = path.posix.dirname(rel);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.posix.normalize(path.posix.join(dir, id))) : id === '@sponsorcoin/spcoin-exchange-engine' ? { engineTrace: () => undefined } : req(id)), mod, mod.exports);
  return mod.exports;
}
const { resolveAccountSource } = load('account/accountSource');
const { createWallet } = load('wallet/wallet');
const { createAuthenticatorRegistry } = load('auth/resolve');

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

const auth = (id, label, { accounts = [], known, vault, removed } = {}) => ({
  id,
  label,
  displayName: label,
  ...(vault ? { vault: vault === true ? { capabilities: {}, accounts: () => [] } : vault } : {}),
  async accounts() { return accounts.map((address) => ({ address })); },
  ...(known ? { async knownAccounts() { return known.map((address) => ({ address, connected: false })); } } : {}),
  ...(removed ? { async removeAccount(address) { removed.push(address); } } : {}),
});
const walletOf = (...list) => {
  const registry = createAuthenticatorRegistry();
  list.forEach((a) => registry.register({ onChange: () => () => {}, ...a }));
  return createWallet({ registry, appDefault: () => undefined });
};

await test('an account only MetaMask holds: "Held by MetaMask" and a Remove from Merit button that calls the wallet\'s removeAccount', async () => {
  const removed = [];
  const w = walletOf(auth('server', 'Merit (Web App)', { vault: true, accounts: [B] }), auth('mm', 'MetaMask', { accounts: [A], removed }));
  const s = await resolveAccountSource(w, A, B);
  assert.equal(s.heldBy, 'MetaMask');
  assert.match(s.removal.label, /^Remove Remote Account from /);
  assert.equal(s.removal.destructive, false, 'dropping the access of another wallet is reversible: not red');
  assert.equal(s.removal.disabledReason, undefined);
  assert.match(s.removal.message, /still exists in MetaMask/);
  await s.removal.remove();
  assert.deepEqual(removed, [A]);
});

await test('the ACTIVE account cannot be removed: the button is disabled with the reason (X2)', async () => {
  const w = walletOf(auth('mm', 'MetaMask', { accounts: [A], removed: [] }));
  const s = await resolveAccountSource(w, A, A.toUpperCase().replace('0X', '0x'));
  assert.match(s.removal.disabledReason, /another account active/);
});

await test('a DISCONNECTED account (listed by knownAccounts, not by accounts) is still found', async () => {
  const w = walletOf(auth('mm', 'MetaMask', { accounts: [], known: [A], removed: [] }));
  const s = await resolveAccountSource(w, A, undefined);
  assert.equal(s.heldBy, 'MetaMask');
  assert.ok(s.removal);
});

await test('an account a VAULT holds (a local account): no "Held by", a red Delete button; the dialog asks for the password (removal.local); remove(password) goes to the vault; the key is shown only through revealKey (2026-11-10, rows 7 and 8)', async () => {
  const calls = [];
  const vault = {
    capabilities: { removeAccount: true, revealKey: true },
    accounts: () => [{ address: A, source: 'imported' }],
    async removeAccount(credential, address) { calls.push(['remove', credential, address]); if (credential.value !== 'pw') throw new Error('Incorrect password.'); },
    async revealPrivateKey(credential, address) { calls.push(['reveal', credential, address]); return '0xkey'; },
  };
  const w = walletOf(auth('server', 'Merit (Web App)', { vault, accounts: [A] }), auth('mm', 'MetaMask', { accounts: [A], removed: [] }));
  const s = await resolveAccountSource(w, A, B);
  assert.equal(s.heldBy, undefined);
  assert.equal(s.title, 'Merit Local Account Details');
  assert.match(s.removal.label, /^Remove Local Account from /);
  assert.equal(s.removal.destructive, true);
  assert.equal(s.removal.disabledReason, undefined);
  assert.match(s.removal.message, /imported from a private key/);
  assert.ok(s.removal.local, 'a local account is deleted behind the password');
  await assert.rejects(s.removal.remove('wrong'), /Incorrect password/);
  await s.removal.remove('pw');
  assert.equal(await s.removal.local.revealKey('pw'), '0xkey');
  assert.deepEqual(calls.map((c) => c[0]), ['remove', 'remove', 'reveal']);
  assert.deepEqual(calls[1][1], { kind: 'password', value: 'pw' });
  const active = await resolveAccountSource(w, A, A);
  assert.match(active.removal.disabledReason, /another account active/);
});

await test('a phrase-derived local account: the warning says only the Recovery Phrase can bring it back; a vault that cannot delete: the button says so', async () => {
  const derived = { capabilities: { removeAccount: true }, accounts: () => [{ address: A, source: 'generated' }], async removeAccount() {} };
  const s = await resolveAccountSource(walletOf(auth('server', 'Merit (Web App)', { vault: derived, accounts: [A] })), A, B);
  assert.match(s.removal.message, /Recovery Phrase/);
  assert.equal(s.removal.local.revealKey, undefined, 'no reveal when the vault cannot show keys');
  const fixed = { capabilities: {}, accounts: () => [{ address: A, source: 'imported' }] };
  const n = await resolveAccountSource(walletOf(auth('server', 'Merit (Web App)', { vault: fixed, accounts: [A] })), A, B);
  assert.match(n.removal.disabledReason, /cannot remove accounts/);
});

await test('the SAME address in two groups: the row opened decides (MetaMask row = remote, Merit row = local)', async () => {
  const removed = [];
  const w = walletOf(auth('server', 'Merit (Web App)', { vault: true, accounts: [A] }), auth('mm', 'MetaMask', { accounts: [A], removed }));
  const remote = await resolveAccountSource(w, A, B, 'mm', 'Doggie');
  assert.equal(remote.heldBy, 'MetaMask');
  assert.equal(remote.title, 'MetaMask Remote Account Details');
  assert.match(remote.removal.label, /^Remove Remote Doggie from .+/);
  await remote.removal.remove();
  assert.deepEqual(removed, [A]);
  const local = await resolveAccountSource(w, A, B, 'server', 'Doggie');
  assert.equal(local.title, 'Merit Local Account Details');
  assert.match(local.removal.label, /^Remove Local Doggie from .+/);
  assert.equal((await resolveAccountSource(w, A, B)).title, 'Merit Local Account Details');
});

await test('a wallet that cannot remove accounts: "Held by" only, no button', async () => {
  const w = walletOf(auth('hw', 'Ledger', { accounts: [A] }));
  const s = await resolveAccountSource(w, A, B);
  assert.equal(s.heldBy, 'Ledger');
  assert.equal(s.removal, undefined);
});

await test('Wallet.removeAccount (row 3) chooses the path: another wallet disconnects and forgets; a local account needs the credential and goes to the vault; nobody holding it, or nobody able, is a readable error', async () => {
  const removed = [];
  const vaultCalls = [];
  const vault = { capabilities: { removeAccount: true }, accounts: () => [{ address: A, source: 'imported' }], async removeAccount(credential, address) { vaultCalls.push([credential.value, address]); } };
  const w = walletOf(auth('server', 'Merit (Web App)', { vault, accounts: [A] }), auth('mm', 'MetaMask', { accounts: [A], removed }));
  await w.removeAccount(A, { groupId: 'mm' });
  assert.deepEqual(removed, [A]);
  assert.deepEqual(vaultCalls, []);
  await assert.rejects(w.removeAccount(A, { groupId: 'server' }), /password is required/);
  await w.removeAccount(A, { groupId: 'server', credential: { kind: 'password', value: 'pw' } });
  assert.deepEqual(vaultCalls, [['pw', A]]);
  await assert.rejects(w.removeAccount(B), /not in this wallet/);
  const ledger = walletOf(auth('hw', 'Ledger', { accounts: [A] }));
  await assert.rejects(ledger.removeAccount(A), /cannot remove accounts from here/);
});

await test('an account nobody holds, and a wallet that cannot be asked, give nothing and no error', async () => {
  const broken = { id: 'x', label: 'X', accounts: async () => { throw new Error('locked'); } };
  assert.equal(await resolveAccountSource(walletOf(broken, auth('mm', 'MetaMask', { accounts: [A] })), B, A), undefined);
});

await test('the screen: Account Details asks the host who holds the account, draws RemoveAccountPanel and the Held by row, and the host leaves the screen after a removal', async () => {
  let screen = read('account', 'AccountDetailScreen.tsx');
  if (m === 'screenNoButton') screen = screen.replace('<RemoveAccountPanel', '<span');
  assert.match(screen, /accountSource\?\(address: string, symbol\?: string\): Promise<AccountSource \| undefined>/);
  assert.match(screen, /<RemoveAccountPanel removal=\{accountSource\.removal\}/);
  assert.match(screen, /<HeldPrivateKeyRow heldBy=/);
  assert.match(screen, /host\.onAccountRemoved\?\.\(address, message\)/);
  assert.match(screen, /balanceText=\{balanceText\}/, 'the local delete dialog gets the balance (X5)');
  assert.match(read('MeritWallet.tsx'), /accountNoticeStore\.publish\(message, \[address\]\)/, 'a removal is confirmed in MESSAGE_PANEL (row 9)');
  assert.match(read('MeritWallet.tsx'), /engineTrace\('account:removed'/, 'a removal is traced (row 9)');
  assert.match(read('account', 'accountSource.ts'), /doneMessage: `Removed \$\{what\} from \$\{app\}`/);
  const wallet = read('MeritWallet.tsx');
  assert.match(wallet, /resolveAccountSource\(wallet, address, activeAccountAddress, accountDetailGroup \?\? undefined, symbol\)/);
  assert.match(wallet, /openAccountDetail\(account\.address!, group\.id\)/);
  assert.match(wallet, /accountDetailTitle \?\? 'Account Details'/);
  // 2026-11-11 (owner): after a removal MESSAGE_PANEL and ACCOUNT_PANEL are closed BY NAME, never one pop of whatever is on top (a single pop left ACCOUNT_PANEL on the stack under the list)
  assert.match(wallet, /closePanel\(SP_COIN_DISPLAY\.MESSAGE_PANEL, 'NAV_CLOSE:MeritWallet:accountRemoved'\)/);
  assert.match(wallet, /closePanel\(SP_COIN_DISPLAY\.ACCOUNT_PANEL, 'NAV_CLOSE:MeritWallet:accountRemoved'\)/);
  assert.doesNotMatch(wallet, /closePanel\('NAV_POP:MeritWallet:accountRemoved'\)/);
});

await test('the confirmation is shown in MESSAGE_PANEL (owner, 2026-11-10), not in a popup: the words and the account row are the message, the password / Show-Hide key / buttons are the panel\'s pending-decision controls', async () => {
  const panel = read('account', 'RemoveAccountPanel.tsx');
  assert.ok(!/DialogPortal|role="dialog"/.test(panel), 'no popup');
  assert.match(panel, /openPanel\(SP_COIN_DISPLAY\.MESSAGE_PANEL, 'RemoveAccount:confirm'\)/);
  assert.match(panel, /pendingApprovalMessageStore\.set\(/);
  assert.match(panel, /requirePassword: !!local/, 'the password is asked only for a local account');
  assert.match(panel, /approveLabel: removal\.confirmLabel/);
  assert.match(panel, /\.remove\(local \? password : undefined\)/, 'the password goes to remove() only for a local account');
  assert.match(panel, /revealKey: local\?\.revealKey/, 'the key reveal is offered only when the vault can show keys');
  assert.match(panel, /MESSAGE_ACCOUNTS_MARKER/, 'the account row (icon, name, the whole address) is part of the message');
  assert.match(panel, /removal\.message/);
  assert.match(panel, /clearWhenMessageCloses\(\);/, 'closing the message is Cancel (watched at module level: the screen is replaced while the message is up)');
  assert.ok(!/useEffect/.test(panel), 'no hook of this screen clears the controls: the screen unmounts while the message is up');
  assert.match(read('panels', 'MessagePanelReal.tsx'), /passwordVisible \? 'text' : 'password'/, 'the password has the show / hide eye like the login screen');
  const mp = read('panels', 'MessagePanelReal.tsx');
  assert.match(mp, /shownKey \? 'Hide Private Key' : 'Show Private Key'/, 'one toggle: Show / Hide Private Key');
  assert.match(mp, /shownKey \|\| KEY_MASK/, 'the key is hidden (stars) until shown');
  assert.match(mp, /KEY_SHOW_MS/, 'the key hides again');
  assert.match(mp, /other programs can read it/, 'the clipboard warning');
  assert.match(mp, /pendingApproval\.revealKey\?\.\(password\)/, 'showing the key asks the vault with the typed password');
  assert.match(read('account', 'form', 'AccountFormPanel.tsx'), /accountFormClass\.table\(tableGrid, \{ footer: !!footer, bare \}\)/);
  assert.match(read('account', 'AccountDetailScreen.tsx'), /footer=\{accountSource\?\.removal \? <RemoveAccountPanel/);
  assert.match(panel, /removeAccountStyle\.button\(disabled, removal\.destructive\)/);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
