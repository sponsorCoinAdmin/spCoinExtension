// File: test/signMessagesThrough.test.mjs
//
// docs/design/accountAuthDesign.txt rows 4, 5, 13 (lib/spCoin/signMessagesThrough.ts): MetaMask's ethers signer keeps its own path for everything but MESSAGE signing, which goes through the registered authenticator (so it gets the waiting notice and the shared error words):
// text goes through as written, bytes as hex, the authenticator is asked for the signer's address, a missing authenticator falls back to the signer's own signMessage, and every other member of the signer (the address, a transaction, members that use private state)
// is the original's. Run: node test/signMessagesThrough.test.mjs
// MUTANT=signDirect|bytesNotHex|everythingThrough|membersNotBound|noFallback|wrongAddress run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'signMessagesThrough.ts'), 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'signDirect') swap("return through ? through.signMessage(address, typeof message === 'string' ? message : hexlify(message)) : target.signMessage(message);", 'return target.signMessage(message);');
if (m === 'bytesNotHex') swap("typeof message === 'string' ? message : hexlify(message)", 'message');
if (m === 'everythingThrough') swap("const value = Reflect.get(target, property, target);", "if (property === 'sendTransaction') return () => authenticatorCalls.push('sendTransaction');\n      const value = Reflect.get(target, property, target);");
if (m === 'membersNotBound') swap("return typeof value === 'function' ? value.bind(target) : value;", 'return value;');
if (m === 'noFallback') swap(": target.signMessage(message);", ": Promise.reject(new Error('no authenticator'));");
if (m === 'wrongAddress') swap('through.signMessage(address,', "through.signMessage('0x0000000000000000000000000000000000000000',");
const authenticatorCalls = [];
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', 'authenticatorCalls', js)((id) => req(id), mod, mod.exports, authenticatorCalls);
const { signMessagesThrough } = mod.exports;

const A = '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25';
// a signer that uses private state in its methods, like ethers' own
class FakeSigner { #secret = 'own'; async getAddress() { return A; } async signMessage(msg) { return 'direct:' + this.#secret + ':' + msg; } async sendTransaction(tx) { return { hash: '0xown', via: this.#secret, tx }; } }
const fakeAuthenticator = () => ({ signMessage: async (address, message) => { authenticatorCalls.push(['signMessage', address, message]); return 'auth:' + message; } });

const results = [];
const test = async (name, fn) => { authenticatorCalls.length = 0; try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('a message is signed by the authenticator, for the signer\'s address', async () => {
  const s = signMessagesThrough(new FakeSigner(), fakeAuthenticator, A);
  assert.equal(await s.signMessage('hello'), 'auth:hello');
  assert.deepEqual(authenticatorCalls, [['signMessage', A, 'hello']]);
});

await test('bytes are handed over as hex', async () => {
  const s = signMessagesThrough(new FakeSigner(), fakeAuthenticator, A);
  assert.equal(await s.signMessage(new Uint8Array([1, 2, 255])), 'auth:0x0102ff');
});

await test('every other member is the original signer\'s: the address, a transaction, members that use the signer\'s private state', async () => {
  const s = signMessagesThrough(new FakeSigner(), fakeAuthenticator, A);
  assert.equal(await s.getAddress(), A);
  const sent = await s.sendTransaction({ to: A });
  assert.deepEqual([sent.hash, sent.via], ['0xown', 'own']);
  assert.deepEqual(authenticatorCalls, []);
});

await test('with no authenticator registered the signer\'s own signMessage still works', async () => {
  const s = signMessagesThrough(new FakeSigner(), () => undefined, A);
  assert.equal(await s.signMessage('hi'), 'direct:own:hi');
});

await test('an authenticator that refuses is the error the caller sees (one error set, not the provider\'s)', async () => {
  const refusing = () => ({ signMessage: async () => { const e = new Error('You declined it.'); e.code = 'user_rejected'; throw e; } });
  const s = signMessagesThrough(new FakeSigner(), refusing, A);
  await assert.rejects(s.signMessage('x'), (e) => e.code === 'user_rejected');
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
