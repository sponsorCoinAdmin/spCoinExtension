export declare const TOTP_STEP_SECONDS = 30;
export declare const TOTP_DIGITS = 6;
export declare function base32Encode(bytes: Uint8Array): string;
export declare function base32Decode(text: string): Uint8Array;
/** A new random 160 bit secret, base32 (the form an authenticator app takes). */
export declare function generateTotpSecret(random?: (length: number) => Uint8Array): string;
/** The code for one time step. `counter` is floor(unixSeconds / 30). */
export declare function hotp(secret: string, counter: number, subtle?: SubtleCrypto): Promise<string>;
export declare function totpCode(secret: string, nowMs?: number, subtle?: SubtleCrypto): Promise<string>;
/** True when `code` is the code for the current step, or one step either side (a slow clock or a slow typist). */
export declare function verifyTotp(secret: string, code: string, nowMs?: number, subtle?: SubtleCrypto): Promise<boolean>;
/** The otpauth:// link an authenticator app reads (a QR code carries the same text). */
export declare function otpauthUri(secret: string, account: string, issuer?: string): string;
