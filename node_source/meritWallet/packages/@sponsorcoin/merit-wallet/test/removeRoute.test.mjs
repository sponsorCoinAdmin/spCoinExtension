// File: test/removeRoute.test.mjs
//
// 2026-11-10 (docs/design/removeAccountPlan.txt rows 8 and 10; rule X5): the web app's POST /api/spCoin/meritConnect/removeAccount, pinned from source: the guards come first (dev keystore gate, same origin, the shared unlock rate limit), the
// password is checked (the account's own key, or the master verifier for a legacy entry) BEFORE the entry is removed, a wrong password is 401 and removes nothing, and nothing secret is returned. The vault's client side is in devKeystoreVault.test.mjs.
// Run: node test/removeRoute.test.mjs     MUTANT=removeFirst|noOriginCheck|noRateLimit|noGate|keyReturned|noPasswordCheck run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let route = fs.readFileSync(path.join(WEB, 'app', 'api', 'spCoin', 'meritConnect', 'removeAccount', 'route.ts'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'removeFirst') route = swap(route, 'const match = await readMeritWalletKeyStoreEntry(address);', 'await removeMeritWalletKeyStoreEntry(address);\n    const match = await readMeritWalletKeyStoreEntry(address);');
if (m === 'noOriginCheck') route = swap(route, 'if (!isSameOriginRequest(request))', 'if (false)');
if (m === 'noRateLimit') route = swap(route, "await consumeAuthRateLimit('unlock'", "await (async () => ({ ok: true }))(");
if (m === 'noGate') route = swap(route, 'if (devClosed) return devClosed;', '');
if (m === 'noPasswordCheck') route = swap(route, 'if (!check.ok) return reply({ ok: false, message: check.message }, check.status);', '');
if (m === 'keyReturned') route = swap(route, "return reply({ ok: true }, 200);", "return reply({ ok: true, privateKey: String(match.privateKey ?? match.encryptedKey) }, 200);");

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const at = (needle) => { const i = route.indexOf(needle); assert.ok(i >= 0, 'missing: ' + needle); return i; };

await test('the guards run first and in order: dev keystore gate, same origin, rate limit', () => {
  assert.ok(at('devKeystoreClosedResponse()') < at('isSameOriginRequest(request)'));
  assert.ok(at('if (devClosed) return devClosed;') < at('isSameOriginRequest(request)'));
  assert.ok(at('isSameOriginRequest(request)') < at("consumeAuthRateLimit('unlock'"));
  assert.ok(at("consumeAuthRateLimit('unlock'") < at('removeMeritWalletKeyStoreEntry(address)'));
});
await test('the password is checked before the entry is removed, for both key shapes; a wrong one is 401 and nothing is removed', () => {
  // the route asks the shared check (lib/server/meritKeyStorePasswordCheck.server.ts, also used by reveal) and stops on a failure; the check covers both key shapes
  const check = fs.readFileSync(path.join(WEB, 'lib', 'server', 'meritKeyStorePasswordCheck.server.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(at('checkKeyStorePassword(address, match, password, false)') < at('removeMeritWalletKeyStoreEntry(address)'));
  assert.ok(at('if (!check.ok) return reply({ ok: false, message: check.message }, check.status);') < at('removeMeritWalletKeyStoreEntry(address)'));
  assert.ok(check.indexOf('resolveMeritWalletSignerPrivateKey(address, password)') >= 0, 'the encrypted shape is checked like every signer');
  assert.ok(check.indexOf('decryptPrivateKey(verifier, password)') >= 0, 'the legacy shape is checked against the master verifier');
  assert.equal(check.split("'Incorrect password.'").length - 1, 2);
  assert.equal((check.match(/status: 401/g) ?? []).length, 2, 'a wrong password is 401 in both shapes');
  assert.equal((route.match(/removeMeritWalletKeyStoreEntry\(address\)/g) ?? []).length, 1, 'there is one removal, after the checks');
});
await test('an address and a password are required, and nothing secret is returned', () => {
  assert.match(route, /A valid address is required\./);
  assert.match(route, /A password is required\./);
  assert.match(route, /return reply\(\{ ok: true \}, 200\);/);
  assert.ok(!/privateKey/.test(route.replace(/match\.privateKey/g, '').replace(/resolveMeritWalletSignerPrivateKey/g, '').replace(/decryptPrivateKey/g, '').replace(/PrivateKey/g, '')), 'no key goes out');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
