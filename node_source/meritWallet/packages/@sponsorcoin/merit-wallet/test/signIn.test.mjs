// File: test/signIn.test.mjs
//
// Tests for the one sign-in (src/account/signIn.ts, docs/design/accountAuthDesign.txt row 13 / 10.6): nonce, signature, verify, token; the active authenticator is the signer; failures read the same in every host. Run: node test/signIn.test.mjs
// MUTANT=wrongAddress|acceptEmptySignature|noStatusHint|rejectionLeaks|noTokenCheck|bypassWalletAuthenticator run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (file.endsWith('signIn.ts')) {
    const m = process.env.MUTANT;
    const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
    // the verify body names a different address than the one that signed
    if (m === 'wrongAddress') mutate("body: JSON.stringify({ address, nonce, signature }) });\n  if (!verifyResponse.ok)", "body: JSON.stringify({ address: address.toUpperCase(), nonce, signature }) });\n  if (!verifyResponse.ok)");
    // an empty signature is sent to the server
    if (m === 'acceptEmptySignature') mutate("  if (!signature) throw new Error('Signature request rejected');\n", '');
    // a server that gives no reason says nothing about what its status means
    if (m === 'noStatusHint') mutate("const hint = nonceResponse.status === 429 ? 'Too many auth attempts. Please wait and try again.' : nonceResponse.status === 503 ? 'Server auth is not configured.' : '';", "const hint = '';");
    // a rejection in the wallet reaches the user as the wallet's raw error
    if (m === 'rejectionLeaks') mutate("if (error instanceof AuthenticatorError && error.code === 'user_rejected') throw new Error('Signature request rejected');", '');
    // a verify answer without a token is accepted
    if (m === 'noTokenCheck') mutate("  if (!token) throw new Error('Missing auth token');\n", '');
    // the wallet's authenticator is not asked: a fixed signer signs
    if (m === 'bypassWalletAuthenticator') mutate('return await authenticator.signMessage(params.address, message);', "return '0xfixed';");
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { signInForToken, signInWithWallet } = load(path.join(SRC, 'account', 'signIn.ts'));
const { AuthenticatorError } = load(path.join(SRC, 'auth', 'authenticator.ts'));

const ADDR = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
// a fake hosted app: records every request, answers per script
const server = ({ nonce = { nonce: 'n1', message: 'sign me n1' }, nonceStatus = 200, verify = { token: 'tok' }, verifyStatus = 200 } = {}) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    if (url.endsWith('/auth/nonce')) return reply(nonceStatus, nonce);
    return reply(verifyStatus, verify);
  };
  return { calls, fetchImpl };
};

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

await test('the challenge is signed and the token comes back; the verify call carries the address, the nonce and the signature', async () => {
  const s = server();
  const signed = [];
  const token = await signInForToken({ baseUrl: 'http://app', address: ADDR, signMessage: async (m) => { signed.push(m); return '0xsig'; }, fetchImpl: s.fetchImpl });
  assert.equal(token, 'tok');
  assert.deepEqual(signed, ['sign me n1']);
  assert.equal(s.calls[0].url, 'http://app/api/spCoin/auth/nonce');
  assert.deepEqual(s.calls[1].body, { address: ADDR, nonce: 'n1', signature: '0xsig' });
});

await test('an empty signature is a rejection and nothing is sent to verify', async () => {
  const s = server();
  await assert.rejects(() => signInForToken({ address: ADDR, signMessage: async () => '', fetchImpl: s.fetchImpl }), /Signature request rejected/);
  assert.equal(s.calls.length, 1);
});

await test('a server that gives no reason: 429 and 503 say what they mean; any other status keeps the generic text', async () => {
  for (const [status, text] of [[429, /Too many auth attempts/], [503, /not configured/], [500, /Nonce request failed \(HTTP 500\)/]]) {
    const s = server({ nonceStatus: status, nonce: {} });
    await assert.rejects(() => signInForToken({ address: ADDR, signMessage: async () => '0xsig', fetchImpl: s.fetchImpl }), text);
  }
});

await test('the server\'s own reason wins over the hint', async () => {
  const s = server({ nonceStatus: 429, nonce: { error: 'Slow down for 10 seconds' } });
  await assert.rejects(() => signInForToken({ address: ADDR, signMessage: async () => '0xsig', fetchImpl: s.fetchImpl }), /Slow down for 10 seconds/);
});

await test('a verify answer without a token is an error', async () => {
  const s = server({ verify: {} });
  await assert.rejects(() => signInForToken({ address: ADDR, signMessage: async () => '0xsig', fetchImpl: s.fetchImpl }), /Missing auth token/);
});

const fakeWallet = (signer) => ({ authenticatorFor: async () => ({ signMessage: signer }) });

await test('with the wallet, the account\'s ACTIVE authenticator signs, for the account\'s own address', async () => {
  const s = server();
  const asked = [];
  const token = await signInWithWallet(fakeWallet(async (address, message) => { asked.push([address, message]); return '0xfromwallet'; }), { address: ADDR, fetchImpl: s.fetchImpl });
  assert.equal(token, 'tok');
  assert.deepEqual(asked, [[ADDR, 'sign me n1']]);
  assert.equal(s.calls[1].body.signature, '0xfromwallet');
});

await test('a rejection in the wallet reads as one clear message in every host', async () => {
  const s = server();
  const rejecting = fakeWallet(async () => { throw new AuthenticatorError('user_rejected', 'MetaMask Tx Signature: User denied message signature.', 'injected:io.metamask'); });
  await assert.rejects(() => signInWithWallet(rejecting, { address: ADDR, fetchImpl: s.fetchImpl }), /^Error: Signature request rejected$/);
});

let failed = 0;
for (const [status, text] of results) {
  console.log(status + ' ' + text);
  if (status === 'FAIL') failed += 1;
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nall ' + results.length + ' passed');
process.exit(failed ? 1 : 0);
