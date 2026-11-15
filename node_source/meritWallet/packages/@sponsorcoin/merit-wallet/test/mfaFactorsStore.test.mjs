// File: test/mfaFactorsStore.test.mjs
//
// The shared sign-in options store (src/security/mfaFactorsStore.ts): both apps give it their own storage and get the same behaviour. Run: node test/mfaFactorsStore.test.mjs
// MUTANT=noSwitchOn runs against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'security', 'mfaFactorsStore.ts'), 'utf8');
if (process.env.MUTANT === 'noSwitchOn') src = src.replace("writeOption('passkey', true);", '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
const fakeRequire = (id) => (id === './passkey' ? { assertPasskey: async () => true } : id === './totp' ? { verifyTotp: async (secret, code) => code === '123456' && secret === 'S' } : req(id));
new Function('require', 'module', 'exports', js)(fakeRequire, m, m.exports);
const { createSecuritySetup } = m.exports;

const memory = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) };
};
const make = (store) => createSecuritySetup({ storage: () => store, credentials: () => ({}), accountLabel: 'X' });
let n = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
    console.log('ok -', name);
  } catch (e) {
    console.log('FAIL -', name, e.message.split('\n')[0]);
    process.exitCode = 1;
  }
};

await test('nothing is set up at first, and both options are off', () => {
  const host = make(memory());
  assert.deepEqual(host.signIn.enrolled(), { passkey: false, totp: false });
  assert.deepEqual(host.signIn.options(), { passkey: false, totp: false });
});
await test('setting a step up also switches it on and keeps it across a reload', async () => {
  const store = memory();
  const host = make(store);
  await host.enrollPasskey({ credentialId: 'A' });
  assert.deepEqual(host.signIn.enrolled(), { passkey: true, totp: false });
  assert.equal(host.signIn.options().passkey, true);
  await host.enrollTotp('S');
  assert.deepEqual(make(store).signIn.enrolled(), { passkey: true, totp: true });
});
await test('registering the same passkey twice keeps one', async () => {
  const store = memory();
  const host = make(store);
  await host.enrollPasskey({ credentialId: 'A' });
  await host.enrollPasskey({ credentialId: 'A', publicKey: 'K' });
  assert.equal(JSON.parse(store.getItem('merit.mfaFactors.v1')).passkeys.length, 1);
});
await test('a step can be switched off and its setup is kept', async () => {
  const host = make(memory());
  await host.enrollTotp('S');
  host.signIn.setOption('totp', false);
  assert.equal(host.signIn.options().totp, false);
  assert.equal(host.signIn.enrolled().totp, true);
});
await test('the authenticator code is checked against the kept secret', async () => {
  const host = make(memory());
  assert.equal(await host.signIn.verifyTotp('123456'), false);
  await host.enrollTotp('S');
  assert.equal(await host.signIn.verifyTotp('123456'), true);
  assert.equal(await host.signIn.verifyTotp('000000'), false);
});
await test('a host with no storage keeps nothing and does not throw', async () => {
  const host = createSecuritySetup({ storage: () => undefined, credentials: () => undefined, accountLabel: 'X' });
  await host.enrollPasskey({ credentialId: 'A' });
  assert.deepEqual(host.signIn.enrolled(), { passkey: false, totp: false });
  assert.equal(host.credentials, undefined);
});
await test('the passkey check needs the device store', async () => {
  const host = createSecuritySetup({ storage: memory, credentials: () => undefined, accountLabel: 'X' });
  await assert.rejects(() => host.signIn.verifyPasskey());
});
console.log(`${n} passed`);
