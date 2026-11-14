// File: src/security/passkey.ts
//
// 2026-11-13 (owner request: optional MFA after the recovery phrase): registering a passkey (WebAuthn) as a second factor. Returns the credential id and public key for the host to keep and check later; nothing
// secret leaves the authenticator. `credentials` is injectable so the flow is testable without a browser.

export interface PasskeyRegistration {
  /** base64url credential id. */
  credentialId: string;
  /** base64url COSE public key, when the browser exposes it. */
  publicKey?: string;
}

export function passkeysSupported(credentials: CredentialsContainer | undefined): boolean {
  return !!credentials && typeof credentials.create === 'function' && typeof PublicKeyCredential !== 'undefined';
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (const byte of view) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function registerPasskey(
  user: { id: string; name: string },
  credentials: CredentialsContainer, // injected by the host (the device is only touched in the host adapter)
  random: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length)),
): Promise<PasskeyRegistration> {
  const created = (await credentials.create({
    publicKey: {
      challenge: random(32) as BufferSource,
      rp: { name: 'Merit Wallet' },
      user: { id: new TextEncoder().encode(user.id) as BufferSource, name: user.name, displayName: user.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!created) throw new Error('The passkey was not created.');
  const response = created.response as AuthenticatorAttestationResponse;
  const key = typeof response.getPublicKey === 'function' ? response.getPublicKey() : null;
  return { credentialId: toBase64Url(created.rawId), publicKey: key ? toBase64Url(key) : undefined };
}

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

/**
 * 2026-11-13 (owner: the passkey must be used at sign-in): asks the device to prove one of the registered passkeys (fingerprint, face, screen lock or key). True only when the device answered.
 * This is a check on THIS device: it proves the person is present, it is not a server check (the signature is not verified against a server challenge).
 */
export async function assertPasskey(
  credentialIds: string[],
  credentials: CredentialsContainer, // injected by the host (the device is only touched in the host adapter)
  random: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length)),
): Promise<boolean> {
  if (credentialIds.length === 0) return false;
  try {
    const got = await credentials.get({
      publicKey: {
        challenge: random(32) as BufferSource,
        allowCredentials: credentialIds.map((id) => ({ type: 'public-key' as const, id: fromBase64Url(id) as BufferSource })),
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!got;
  } catch {
    return false;
  }
}
