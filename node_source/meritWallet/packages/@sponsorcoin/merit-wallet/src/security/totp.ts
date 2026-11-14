// File: src/security/totp.ts
//
// 2026-11-13 (owner request: optional MFA after the recovery phrase): authenticator-app codes, RFC 6238 (TOTP) over RFC 4226 (HOTP), HMAC-SHA1, 6 digits, 30 second steps: what Google Authenticator, 1Password and
// Authy accept. Pure and host-independent (WebCrypto only). The secret is made here; where it is kept is the host's call (a second factor is only a second factor if it is checked somewhere other than this device).

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const index = B32.indexOf(ch);
    if (index < 0) throw new Error('Not a valid authenticator key.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** A new random 160 bit secret, base32 (the form an authenticator app takes). */
export function generateTotpSecret(random: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length))): string {
  return base32Encode(random(20));
}

/** The code for one time step. `counter` is floor(unixSeconds / 30). */
export async function hotp(secret: string, counter: number, subtle: SubtleCrypto = crypto.subtle): Promise<string> {
  const message = new Uint8Array(8);
  let rest = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = rest & 255;
    rest = Math.floor(rest / 256);
  }
  const key = await subtle.importKey('raw', base32Decode(secret) as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await subtle.sign('HMAC', key, message as BufferSource));
  const offset = mac[mac.length - 1] & 15;
  const binary = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function totpCode(secret: string, nowMs: number = Date.now(), subtle?: SubtleCrypto): Promise<string> {
  return hotp(secret, Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS), subtle);
}

/** True when `code` is the code for the current step, or one step either side (a slow clock or a slow typist). */
export async function verifyTotp(secret: string, code: string, nowMs: number = Date.now(), subtle?: SubtleCrypto): Promise<boolean> {
  const typed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(typed)) return false;
  const step = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  for (const delta of [0, -1, 1]) if ((await hotp(secret, step + delta, subtle)) === typed) return true;
  return false;
}

/** The otpauth:// link an authenticator app reads (a QR code carries the same text). */
export function otpauthUri(secret: string, account: string, issuer = 'Merit Wallet'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
