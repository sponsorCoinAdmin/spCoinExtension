// File: test/signInOptions.test.mjs
//
// The rule for which extra steps the unlock screen asks for (src/security/signInOptions.ts). ORACLE: the owner's words, for every combination: a step is asked for only when it is switched on AND set up; a step that is on
// but not set up, or set up but off, is not asked for; the password has no entry (it is always asked for). Also the passkey check says no without a registered passkey and when the device refuses.
// Run: node test/signInOptions.test.mjs   (after npm run build)
import assert from 'node:assert/strict';
import { anySignInStep, requiredSignInSteps } from '../dist/security/signInOptions.js';
import { assertPasskey, fromBase64Url, toBase64Url } from '../dist/security/passkey.js';

const bools = [false, true];
let n = 0;
for (const pOn of bools) for (const tOn of bools) for (const pSet of bools) for (const tSet of bools) {
  const got = requiredSignInSteps({ passkey: pOn, totp: tOn }, { passkey: pSet, totp: tSet });
  assert.equal(got.passkey, pOn && pSet);
  assert.equal(got.totp, tOn && tSet);
  assert.equal(anySignInStep(got), (pOn && pSet) || (tOn && tSet));
  n++;
}

const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
assert.deepEqual([...fromBase64Url(toBase64Url(bytes))], [...bytes]);

const deterministic = () => new Uint8Array(32);
assert.equal(await assertPasskey([], { get: async () => ({}) }, deterministic), false, 'no registered passkey');
assert.equal(await assertPasskey([toBase64Url(bytes)], { get: async () => { throw new Error('NotAllowedError'); } }, deterministic), false, 'device refused');
assert.equal(await assertPasskey([toBase64Url(bytes)], { get: async () => null }, deterministic), false, 'no answer');
let asked;
assert.equal(await assertPasskey([toBase64Url(bytes)], { get: async (options) => { asked = options; return {}; } }, deterministic), true);
assert.equal(asked.publicKey.userVerification, 'required');
assert.deepEqual([...new Uint8Array(asked.publicKey.allowCredentials[0].id)], [...bytes], 'only the registered credential is allowed');
console.log(`signInOptions: ok (${n} combinations)`);
