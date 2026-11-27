// File: test/walletSession.test.mjs
//
// docs/meritMigration.txt row 18: Reset Password and Delete Wallet are written once in the component: a host passes a WalletSessionHost (functions and words, no React node), the component draws the dialogs, and the Config buttons open them.
// The web app's 'Remove Account' deletes the whole wallet (deleteButton 'removeAccount'); the extension has its own 'Delete Wallet' button (default). Without the host's call the button keeps the host's own handler.
// Run: node test/walletSession.test.mjs
// MUTANT=pendingSurvivesSubmit|pendingSurvivesUnlockedStatus|resetIgnoresSession|deleteAlwaysRemoveAccount|deleteAlwaysDeleteWallet|noHostFallback|hostNodeProp|noWalletPassed run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let dialogs = read(PKG, 'src', 'config', 'WalletSessionDialogs.tsx');
let sessionLogic = read(PKG, 'src', 'session', 'walletSession.ts');
let session = read(PKG, 'src', 'walletSessionHost.ts');
let connected = read(PKG, 'src', 'config', 'ConnectedWalletConfig.tsx');
const wallet = read(PKG, 'src', 'MeritWallet.tsx');
if (m === 'resetIgnoresSession') dialogs = swap(dialogs, "onResetPassword: session?.changePassword ? () => open('password') : host.onResetPassword,", 'onResetPassword: host.onResetPassword,');
if (m === 'deleteAlwaysRemoveAccount') dialogs = swap(dialogs, 'session?.deleteWallet && !deleteFromRemoveAccount ? () => open(\'delete\') : host.onDeleteWallet', 'host.onDeleteWallet');
if (m === 'deleteAlwaysDeleteWallet') dialogs = swap(dialogs, 'session?.deleteWallet && deleteFromRemoveAccount ? () => open(\'delete\') : host.onDeleteAccount', 'host.onDeleteAccount');
if (m === 'noHostFallback') dialogs = swap(dialogs, ': host.onDeleteAccount,', ': undefined,');
if (m === 'hostNodeProp') session = swap(session, '  deleteButton?:', '  node?: React.ReactNode;\n  deleteButton?:');
if (m === 'noWalletPassed') connected = swap(connected, 'useWalletDerivedProps(wallet, activeAddress, derives)', 'useWalletDerivedProps(undefined, activeAddress, derives)');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
if (m === 'bootIgnoresRestore') sessionLogic = swap(sessionLogic, 'bootRestorePending: status.bootRestorePending ?? false', 'bootRestorePending: false');
if (m === 'failedStatusUnresolved') sessionLogic = swap(sessionLogic, "set({ phase: 'checking', bootStatusResolved: true });", "set({ phase: 'checking', bootStatusResolved: false });");

if (m === 'pendingSurvivesSubmit') sessionLogic = swap(sessionLogic, "set({ submitting: false, phase: 'unlocked', error: '', bootRestorePending: false, ", "set({ submitting: false, phase: 'unlocked', error: '', ");
if (m === 'pendingSurvivesUnlockedStatus') sessionLogic = swap(sessionLogic, 'status.unlocked ? false : (status.bootRestorePending ?? false)', '(status.bootRestorePending ?? false)');
await test('a pending restore never outlives an unlock: a typed password that opens the wallet, or a status that says unlocked, resolves the boot (the login screen must not wait forever)', async () => {
  const ts = await import('typescript');
  const js = ts.transpile(sessionLogic, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 });
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  const create = module.exports.createWalletSession;
  // Logoff in Persisted mode: the status says locked WITH a restore pending, nothing ever clears it, the owner types the right password
  const s = create({ status: async () => ({ initialized: true, unlocked: false, bootRestorePending: true }), create: async () => {}, unlock: async () => true });
  await s.refresh();
  assert.equal(s.getState().phase, 'locked');
  assert.equal(s.getState().bootResolved, false);
  await s.submit('right', '');
  assert.equal(s.getState().phase, 'unlocked');
  assert.equal(s.getState().bootResolved, true, 'an unlock by typing resolves the boot');
  // a wrong password changes nothing about the pending restore
  const w = create({ status: async () => ({ initialized: true, unlocked: false, bootRestorePending: true }), create: async () => {}, unlock: async () => false });
  await w.refresh(); await w.submit('wrong', '');
  assert.equal(w.getState().phase, 'locked'); assert.equal(w.getState().bootResolved, false);
  // a status that reports the wallet unlocked resolves it even if it also claims a restore is pending
  const u = create({ status: async () => ({ initialized: true, unlocked: true, bootRestorePending: true }), create: async () => {}, unlock: async () => true });
  await u.refresh();
  assert.equal(u.getState().phase, 'unlocked'); assert.equal(u.getState().bootResolved, true);
});
await test('the host contract is functions and words only', () => {
  assert.doesNotMatch(session, /React\.ReactNode|JSX\.Element/);
  for (const member of ['changePassword?(currentPassword: string, newPassword: string): Promise<void>;', 'deleteWallet?(password: string): Promise<void>;', "deleteButton?: 'removeAccount' | 'deleteWallet';"]) assert.ok(session.includes(member), member);
});
await test('boot resolution waits for status and a pending persisted-password restore, including failed status reads', async () => {
  const ts = await import('typescript');
  const js = ts.transpile(sessionLogic, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 });
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  const create = module.exports.createWalletSession;
  const good = create({ status: async () => ({ initialized: true, unlocked: false, bootRestorePending: true }), create: async () => {}, unlock: async () => true });
  assert.equal(good.getState().bootResolved, false);
  await good.refresh();
  assert.equal(good.getState().phase, 'locked');
  assert.equal(good.getState().bootStatusResolved, true);
  assert.equal(good.getState().bootResolved, false);
  good.setBootRestorePending(false);
  assert.equal(good.getState().bootResolved, true);
  const failed = create({ status: async () => { throw new Error('offline'); }, create: async () => {}, unlock: async () => false });
  await failed.refresh();
  assert.equal(failed.getState().phase, 'checking');
  assert.equal(failed.getState().bootResolved, true);
});
await test('Reset Password opens the component dialog when the host supplies the call', () => {
  assert.match(dialogs, /onResetPassword: session\?\.changePassword \? \(\) => open\('password'\) : host\.onResetPassword,/);
});
await test('the delete dialog opens from Remove Account (web) or from Delete Wallet (extension), by deleteButton; otherwise the host handlers stay', () => {
  assert.match(dialogs, /onDeleteAccount: session\?\.deleteWallet && deleteFromRemoveAccount \? \(\) => open\('delete'\) : host\.onDeleteAccount,/);
  assert.match(dialogs, /onDeleteWallet: session\?\.deleteWallet && !deleteFromRemoveAccount \? \(\) => open\('delete'\) : host\.onDeleteWallet,/);
});
await test('the component body and the shared Config both use the same dialogs and handlers', () => {
  assert.match(wallet, /<WalletSessionDialogs dialog=\{sessionDialog\} onClose=\{\(\) => setSessionDialog\(null\)\} session=\{walletSession\} \/>/);
  assert.match(wallet, /sessionConfigHandlers\(walletSession, setSessionDialog,/);
  assert.match(connected, /<WalletSessionDialogs dialog=\{dialog\}/);
  assert.match(connected, /sessionConfigHandlers\(walletSession, setDialog,/);
});
await test('the shared Config derives Wallet Security and Backup from the wallet it is given', () => {
  assert.match(connected, /useWalletDerivedProps\(wallet, activeAddress, derives\)/);
  assert.match(connected, /securityPanelContent=\{derived\.configSecurityPanelContent\}/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
