export interface PasskeyRegistration {
    /** base64url credential id. */
    credentialId: string;
    /** base64url COSE public key, when the browser exposes it. */
    publicKey?: string;
}
export declare function passkeysSupported(credentials: CredentialsContainer | undefined): boolean;
export declare function toBase64Url(bytes: ArrayBuffer | Uint8Array): string;
export declare function registerPasskey(user: {
    id: string;
    name: string;
}, credentials: CredentialsContainer, // injected by the host (the device is only touched in the host adapter)
random?: (length: number) => Uint8Array): Promise<PasskeyRegistration>;
export declare function fromBase64Url(text: string): Uint8Array;
/**
 * 2026-11-13 (owner: the passkey must be used at sign-in): asks the device to prove one of the registered passkeys (fingerprint, face, screen lock or key). True only when the device answered.
 * This is a check on THIS device: it proves the person is present, it is not a server check (the signature is not verified against a server challenge).
 */
export declare function assertPasskey(credentialIds: string[], credentials: CredentialsContainer, // injected by the host (the device is only touched in the host adapter)
random?: (length: number) => Uint8Array): Promise<boolean>;
