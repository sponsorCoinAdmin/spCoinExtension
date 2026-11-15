// File: test/authenticator.test.mjs
//
// Tests for the authenticator registry and resolver (src/auth). Run: node test/authenticator.test.mjs
// MUTANT=networkWins|skipSaved|fallbackOther|noMigrationBreak run against deliberately broken copies and must report failures.
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
  if (file.endsWith('resolve.ts')) {
    if (process.env.MUTANT === 'networkWins') src = src.replace('return account.activeAuthenticator ?? account.sourceAuthenticator ?? appDefault(account);', 'return appDefault(account) ?? account.activeAuthenticator;');
    if (process.env.MUTANT === 'skipSaved') src = src.replace('return account.activeAuthenticator ?? account.sourceAuthenticator ?? appDefault(account);', 'return account.sourceAuthenticator ?? appDefault(account);');
    if (process.env.MUTANT === 'fallbackOther') src = src.replace("if (!authenticator) throw new AuthenticatorError('unreachable'", "if (!authenticator && registry.list()[0]) return registry.list()[0];\n  if (!authenticator) throw new AuthenticatorError('unreachable'");
    if (process.env.MUTANT === 'noMigrationBreak') src = src.replace('      break;\n    }\n  }\n  return out;', '    }\n  }\n  return out;');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { createAuthenticatorRegistry, chooseAuthenticatorId, resolveAuthenticator, migrateAuthSourceByChain } = load(path.join(SRC, 'resolve.ts'));
const { AuthenticatorError, authenticatorBadge } = load(path.join(SRC, 'authenticator.ts'));

const fake = (id, available = true) => ({ id, label: id, capabilities: {}, status: async () => ({ available, unlocked: true }), accounts: async () => [], signMessage: async () => '0x', sendTransaction: async () => ({ hash: '0x1' }), onChange: () => () => {} });
const A = '0xaaaa000000000000000000000000000000000001';

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('registry: register, get, list, replace, unregister, change events', () => {
  const r = createAuthenticatorRegistry(); let changes = 0; r.onChange(() => changes++);
  const un = r.register(fake('serverKeystore')); r.register(fake('localVault'));
  assert.deepEqual(r.list().map((a) => a.id).sort(), ['localVault', 'serverKeystore']);
  const second = fake('serverKeystore'); r.register(second); assert.equal(r.get('serverKeystore'), second);
  un(); assert.equal(r.get('serverKeystore'), second, 'an old unregister must not remove a replacement');
  r.unregister('serverKeystore'); assert.equal(r.get('serverKeystore'), undefined);
  assert.equal(changes, 4);
});
await test('choice order: saved choice, then source, then app default (the network never chooses)', () => {
  const def = () => 'localVault';
  assert.equal(chooseAuthenticatorId({ address: A, activeAuthenticator: 'injected:io.metamask', sourceAuthenticator: 'serverKeystore' }, def), 'injected:io.metamask');
  assert.equal(chooseAuthenticatorId({ address: A, sourceAuthenticator: 'serverKeystore' }, def), 'serverKeystore');
  assert.equal(chooseAuthenticatorId({ address: A }, def), 'localVault');
  assert.equal(chooseAuthenticatorId({ address: A }, () => undefined), undefined);
});
await test('resolve: returns the chosen authenticator', async () => {
  const registry = createAuthenticatorRegistry(); registry.register(fake('serverKeystore')); registry.register(fake('localVault'));
  const a = await resolveAuthenticator({ registry, account: { address: A, activeAuthenticator: 'localVault' }, appDefault: () => 'serverKeystore' });
  assert.equal(a.id, 'localVault');
});
await test('resolve: no choice at all is "unsupported"', async () => {
  await assert.rejects(resolveAuthenticator({ registry: createAuthenticatorRegistry(), account: { address: A }, appDefault: () => undefined }), (e) => e instanceof AuthenticatorError && e.code === 'unsupported');
});
await test('resolve: the chosen authenticator is not registered -> "unreachable", and no other one is asked', async () => {
  const registry = createAuthenticatorRegistry(); registry.register(fake('serverKeystore'));
  await assert.rejects(resolveAuthenticator({ registry, account: { address: A, activeAuthenticator: 'injected:io.metamask' }, appDefault: () => 'serverKeystore' }), (e) => e.code === 'unreachable' && e.authenticatorId === 'injected:io.metamask');
});
await test('resolve: a registered but unavailable authenticator is "unreachable"', async () => {
  const registry = createAuthenticatorRegistry(); registry.register(fake('injected:io.metamask', false));
  await assert.rejects(resolveAuthenticator({ registry, account: { address: A, activeAuthenticator: 'injected:io.metamask' }, appDefault: () => undefined }), (e) => e.code === 'unreachable');
});
await test('migration: a per-network source becomes a per-account assignment, first saved chain wins', () => {
  const m = migrateAuthSourceByChain({ 31337: 'merit', 1: 'metamask' }, [
    { address: '0xABC0000000000000000000000000000000000001', chainIds: [31337, 1] },
    { address: '0xDEF0000000000000000000000000000000000002', chainIds: [1] },
    { address: '0x1230000000000000000000000000000000000003', chainIds: [137] },
  ]);
  assert.deepEqual(m, { '0xabc0000000000000000000000000000000000001': 'serverKeystore', '0xdef0000000000000000000000000000000000002': 'injected:io.metamask' });
});
await test('badge names', () => {
  assert.equal(authenticatorBadge('serverKeystore'), 'Merit Wallet'); assert.equal(authenticatorBadge('localVault'), 'Extension');
  assert.equal(authenticatorBadge('injected:io.metamask'), 'MetaMask'); assert.equal(authenticatorBadge('hardware:ledger'), 'Hardware');
});
await test('errors carry a code and the authenticator id', () => {
  const e = new AuthenticatorError('locked', 'Unlock first', 'localVault');
  assert.equal(e.code, 'locked'); assert.equal(e.authenticatorId, 'localVault'); assert.ok(e instanceof Error);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
