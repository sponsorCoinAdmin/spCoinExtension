// File: test/indexedDbKey.test.mjs
//
// docs/meritMigration.txt row 21: createIndexedDbKeyProvider (src/session/indexedDbKey.ts). Runs it against a small fake of IndexedDB (open with an upgrade, an object store with get and put) and Node's real WebCrypto.
// Run: node test/indexedDbKey.test.mjs
// MUTANT=extractable|noReuse|noUpgrade run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'session', 'indexedDbKey.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'extractable') src = src.replace("{ name: 'AES-GCM', length: 256 }, false,", "{ name: 'AES-GCM', length: 256 }, true,");
if (m === 'noReuse') src = src.replace('if (existing) return existing;', '');
if (m === 'noUpgrade') src = src.replace('if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);', '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(() => ({}), mod, mod.exports);
const { createIndexedDbKeyProvider } = mod.exports;

// ---- a tiny fake IndexedDB: databases by name, object stores as Maps, requests that answer on a microtask ----
function fakeIndexedDB() {
  const dbs = new Map(); const log = { opens: 0, upgrades: 0, puts: 0 };
  const answer = (req, fn) => queueMicrotask(() => { try { req.result = fn(); req.onsuccess && req.onsuccess(); } catch (e) { req.error = e; req.onerror && req.onerror(); } });
  return { log, dbs, open(name, version) {
    log.opens += 1;
    const req = {};
    queueMicrotask(() => {
      let rec = dbs.get(name);
      const fresh = !rec;
      if (fresh) { rec = { stores: new Map() }; dbs.set(name, rec); }
      const db = { objectStoreNames: { contains: (s) => rec.stores.has(s) }, createObjectStore: (s) => { rec.stores.set(s, new Map()); }, transaction: (storeName) => {
        const tx = {}; const store = rec.stores.get(storeName);
        if (!store) throw new Error('no such object store: ' + storeName);
        tx.objectStore = () => ({ get: (id) => { const r = {}; answer(r, () => store.get(id)); return r; }, put: (v, id) => { log.puts += 1; store.set(id, v); queueMicrotask(() => tx.oncomplete && tx.oncomplete()); return {}; } });
        return tx; } };
      req.result = db;
      if (fresh) { log.upgrades += 1; req.onupgradeneeded && req.onupgradeneeded(); }
      req.onsuccess && req.onsuccess();
    });
    return req;
  } };
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the first call creates the store and a NON-extractable AES-GCM 256 key; later calls return the very same key', async () => {
  const idb = fakeIndexedDB();
  const get = createIndexedDbKeyProvider({ dbName: 'd', storeName: 's', recordId: 'k', indexedDBImpl: idb, cryptoImpl: webcrypto });
  const a = await get(); const b = await get();
  assert.equal(a, b);
  assert.equal(a.extractable, false);
  assert.deepEqual([a.algorithm.name, a.algorithm.length], ['AES-GCM', 256]);
  assert.deepEqual([...a.usages].sort(), ['decrypt', 'encrypt']);
  assert.equal(idb.log.puts, 1);
  assert.equal(idb.log.upgrades, 1);
});
await test('the key works: encrypt then decrypt round trip', async () => {
  const get = createIndexedDbKeyProvider({ dbName: 'd', storeName: 's', recordId: 'k', indexedDBImpl: fakeIndexedDB(), cryptoImpl: webcrypto });
  const key = await get(); const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('hello'));
  assert.equal(new TextDecoder().decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)), 'hello');
});
await test('two wallets in one database keep separate keys (the record id)', async () => {
  const idb = fakeIndexedDB();
  const one = createIndexedDbKeyProvider({ dbName: 'd', storeName: 's', recordId: 'web', indexedDBImpl: idb, cryptoImpl: webcrypto });
  const two = createIndexedDbKeyProvider({ dbName: 'd', storeName: 's', recordId: 'other', indexedDBImpl: idb, cryptoImpl: webcrypto });
  assert.notEqual(await one(), await two());
});
await test('without IndexedDB the call rejects (the persisted store treats that as "not persisted")', async () => {
  const get = createIndexedDbKeyProvider({ dbName: 'd', storeName: 's', recordId: 'k', indexedDBImpl: undefined, cryptoImpl: webcrypto });
  await assert.rejects(get(), /IndexedDB not available/);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
