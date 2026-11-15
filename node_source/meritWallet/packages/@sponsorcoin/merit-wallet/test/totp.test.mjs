// File: test/totp.test.mjs
//
// src/security/totp.ts against the RFC 6238 Appendix B vectors (secret "12345678901234567890", SHA-1; the RFC lists 8 digit codes, the last 6 digits are the 6 digit code), base32 round trips, the one-step window, and bad input.
// Run: node test/totp.test.mjs   (after npm run build)
import assert from 'node:assert/strict';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpCode, verifyTotp } from '../dist/security/totp.js';

const secret = base32Encode(new TextEncoder().encode('12345678901234567890'));
assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
assert.equal(new TextDecoder().decode(base32Decode(secret)), '12345678901234567890');

for (const [seconds, code] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037']]) {
  assert.equal(await totpCode(secret, seconds * 1000), code, 'RFC 6238 at ' + seconds);
}

// the window: this step and one either side pass, two away fail
const now = 1111111109 * 1000;
assert.ok(await verifyTotp(secret, '081804', now));
assert.ok(await verifyTotp(secret, '081 804', now), 'spaces are ignored');
assert.ok(await verifyTotp(secret, '081804', now + 30000), 'one step late');
assert.ok(await verifyTotp(secret, '081804', now - 30000), 'one step early');
assert.ok(!(await verifyTotp(secret, '081804', now + 90000)), 'three steps away fails');
assert.ok(!(await verifyTotp(secret, '000000', now)));
assert.ok(!(await verifyTotp(secret, '12345', now)), 'five digits');
assert.ok(!(await verifyTotp(secret, 'abcdef', now)));
assert.throws(() => base32Decode('not*base32'));

const made = generateTotpSecret();
assert.match(made, /^[A-Z2-7]{32}$/, '160 bits is 32 base32 characters');
assert.notEqual(made, generateTotpSecret());
assert.match(otpauthUri(made, 'a b'), /^otpauth:\/\/totp\/Merit%20Wallet:a%20b\?secret=[A-Z2-7]{32}&issuer=Merit%20Wallet&algorithm=SHA1&digits=6&period=30$/);
console.log('totp: ok');
