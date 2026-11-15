// File: test/createProfileForm.test.mjs
//
// docs/meritMigration.txt row 10: the shared Create Account screen can carry the account's public profile (name, symbol, description, avatar) for a host that asks for it (createProfile), so the web app does not keep its own create form.
// 2026-11-07 (owner: removing redundancy): the screen is now the Account Details table in add mode (Add New Account), not a form of its own; the profile is always passed. Run: node test/createProfileForm.test.mjs
// MUTANT=profileDropped|noLogoPicker|noReset run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let flow = read(PKG, 'src', 'account', 'AddAccountFlow.tsx');
const index = read(PKG, 'src', 'index.ts');
if (m === 'alwaysForm') flow = swap(flow, '{host.createProfile && (', '{true && (');
if (m === 'profileDropped') flow = swap(flow, 'host.createAccount(target?.id, profile)', 'host.createAccount(target?.id)');
if (m === 'importDropsProfile') flow = swap(flow, 'host.importAccount(pendingKey, target?.id, profile)', 'host.importAccount(pendingKey, target?.id)');
if (m === 'noLogoPicker') flow = swap(flow, 'onFileChange={(event) => setProfile((p) => ({ ...p, logo:', 'onFileChange={(event) => setProfile((p) => ({ ...p, picked:');
if (m === 'formWithoutFlag') flow = swap(flow, 'host.createProfile ? profile : undefined', 'profile');
if (m === 'noReset') flow = swap(flow, "setProfile(EMPTY_PROFILE); setPendingKey('');", "setPendingKey('');");

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the host contract: createProfile switches the form on and createAccount receives the profile', () => {
  assert.match(flow, /createAccount\(targetId\?: AuthenticatorId, profile\?: NewAccountProfile\): Promise<void>;/);
  assert.match(flow, /createProfile\?: boolean;/);
  assert.match(index, /NewAccountProfile/);
});
await test('the screen is the Account Details screen in add mode, drawn by the same base layout (2026-11-09): the picture and the table passed in; field table, Add Account and Cancel', () => {
  for (const part of ['<DetailScreenLayout', '<AccountFormPanel', "submitLabel={pristine ? 'Add Account' : 'Update'}", "revertLabel={pristine ? 'Import Account' : 'Revert'}", 'onFileChange: (event) => setProfile((p) => ({ ...p, logo:']) assert.ok(flow.includes(part), part);
  assert.ok(!flow.includes('<AccountAvatarPanel'), 'no copy of the layout and no avatar panel of its own');
  assert.ok(!flow.includes('id="ACTIVE_ACCOUNT_BODY"'), 'the base owns the body');
});
await test('the typed profile is passed to the host, and is cleared with the rest of the form', () => {
  assert.ok(flow.includes('host.createAccount(target?.id, profile)'));
  assert.ok(flow.includes("setProfile(EMPTY_PROFILE); setPendingKey('');"));
  assert.ok(flow.includes('host.importAccount(pendingKey, target?.id, profile)'), 'a pending (generated or imported) key is added with the typed profile');
});
await test('Add New Account and Import an account are one screen: no separate import form; the buttons are Add Account / Import Account until something changes, then Update / Revert (owner, 2026-11-12)', () => {
  assert.ok(!flow.includes('<ImportAccountForm'), 'no second import screen');
  assert.ok(flow.includes('const pristine = !pendingKey && !profileTyped;'));
  assert.ok(flow.includes('accountScreenVisible = flow.createAccountVisible || flow.importAccountVisible'));
  assert.ok(flow.includes('setPendingKey(generatePrivateKey())'), 'Add Account makes a key first on a host that previews it');
  assert.match(flow, /previewsNewKey\?: boolean;/);
});

await test('adding an account only ADDS it: the web host never makes the new account the active one (owner, 2026-11-10)', () => {
  const web = read(PKG, '..', '..', '..', '..', '..', 'lib', 'spCoin', 'useWebAddAccountHost.ts');
  assert.ok(!/activateKeystoreAccount|setActiveAccount|setActiveAuthenticator/.test(web), 'the add host must not change the active account');
  assert.ok(!flow.includes('setActive'), 'the flow does not either');
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
