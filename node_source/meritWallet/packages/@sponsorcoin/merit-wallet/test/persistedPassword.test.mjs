// File: test/persistedPassword.test.mjs
//
// docs/meritMigration.txt row 21: createPersistedPasswordStore (src/session/persistedPassword.ts), the one "Persisted" password store for the web app and the extension. Runs it with Node's real WebCrypto and an in-memory backend.
// Run: node test/persistedPassword.test.mjs
// MUTANT=noDeleteOnBadBlob|noClamp|sameIv|persistThrows run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'session', 'persistedPassword.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'noDeleteOnBadBlob') src = src.replace('await backend.deleteBlob();\n        return null;', 'return null;');
if (m === 'noClamp') src = src.replace('clampPersistedPasswordTimeoutHours(timeoutHours) * HOUR_MS);\n      } catch {\n        // storage', 'timeoutHours * HOUR_MS);\n      } catch {\n        // storage');
if (m === 'sameIv') src = src.replace('cryptoImpl.getRandomValues(new Uint8Array(12))', 'new Uint8Array(12)');
if (m === 'persistThrows') src = src.replace('// storage or crypto unavailable: simply not persisted', 'throw new Error("boom");');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
const clamp = (h) => (Number.isFinite(h) ? Math.min(24, Math.max(1 / 60, h)) : 1);
new Function('require', 'module', 'exports', js)(() => ({ clampPersistedPasswordTimeoutHours: clamp }), mod, mod.exports);
const { createPersistedPasswordStore } = mod.exports;

const memoryBackend = (over = {}) => {
  const state = { blob: null, ttl: null, key: null, writes: 0, deletes: 0, keysMade: 0 };
  const backend = {
    state,
    getOrCreateKey: async () => { if (!state.key) { state.keysMade += 1; state.key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); } return state.key; },
    readBlob: () => state.blob,
    writeBlob: (b, ttl) => { state.writes += 1; state.blob = b; state.ttl = ttl; },
    deleteBlob: () => { state.deletes += 1; state.blob = null; },
    ...over,
  };
  return backend;
};
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('persist then restore gives the password back; the stored blob is not the password', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.persist('correct horse battery staple', 1);
  assert.equal(await s.restore(), 'correct horse battery staple');
  assert.equal(JSON.stringify(b.state.blob).includes('correct horse'), false);
  assert.equal(b.state.keysMade, 1);
});
await test('every write uses a fresh iv (two writes of the same password differ)', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.persist('pw-12345678', 1); const first = JSON.stringify(b.state.blob);
  await s.persist('pw-12345678', 1);
  assert.notEqual(JSON.stringify(b.state.blob), first);
});
await test('the time limit is clamped to one minute .. 24 hours (and 1 hour for a number that is not finite)', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.persist('pw-12345678', 100); assert.equal(b.state.ttl, 24 * 3_600_000);
  await s.persist('pw-12345678', 0); assert.equal(b.state.ttl, 60_000);
  await s.persist('pw-12345678', NaN); assert.equal(b.state.ttl, 3_600_000);
  await s.persist('pw-12345678', 2.5); assert.equal(b.state.ttl, 2.5 * 3_600_000);
});
await test('touch pushes the expiry out again on the SAME blob, and does nothing when nothing is kept', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.touch(1); assert.equal(b.state.writes, 0);
  await s.persist('pw-12345678', 1); const blob = b.state.blob;
  await s.touch(5);
  assert.equal(b.state.blob, blob); assert.equal(b.state.ttl, 5 * 3_600_000); assert.equal(b.state.writes, 2);
});
await test('nothing kept, or expired (the blob store answers null): restore is null and nothing is deleted', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  assert.equal(await s.restore(), null); assert.equal(b.state.deletes, 0);
});
await test('a blob that cannot decrypt (a different key, or damage) is deleted and restore is null', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.persist('pw-12345678', 1);
  b.state.key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  assert.equal(await s.restore(), null);
  assert.equal(b.state.blob, null); assert.equal(b.state.deletes, 1);
});
await test('clear forgets it; a backend that throws on write is swallowed (not persisted, no exception)', async () => {
  const b = memoryBackend(); const s = createPersistedPasswordStore(b, webcrypto);
  await s.persist('pw-12345678', 1); await s.clear();
  assert.equal(await s.restore(), null);
  const bad = createPersistedPasswordStore(memoryBackend({ writeBlob: () => { throw new Error('quota'); } }), webcrypto);
  await bad.persist('pw-12345678', 1);
  const noKey = createPersistedPasswordStore(memoryBackend({ getOrCreateKey: async () => { throw new Error('no indexeddb'); } }), webcrypto);
  await noKey.persist('pw-12345678', 1);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
