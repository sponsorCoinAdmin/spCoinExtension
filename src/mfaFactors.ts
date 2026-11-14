// File: src/mfaFactors.ts
// Extension twin of the web app's mfaFactors: keeps the sign-in options and enrolled second steps (authenticator app, passkey) in the side panel's own localStorage (the extension origin, synchronous like the host contract needs).
//
// 2026-11-13 (owner request: optional MFA, and Config -> Security sign-in options): where the web app keeps the extra sign-in steps a person sets up (authenticator app secret, passkeys) and which of them are switched on.
// Browser local storage only: nothing is sent to the Merit server. The unlock screen asks for a step when it is switched on AND set up; that is a check on this device (the password remains the vault key).
// A server that asks for the same steps before it relays a remote wallet's approval is the next step (docs: remote wallet auth).
import { assertPasskey, verifyTotp, type PasskeyRegistration, type SecuritySetupHost, type SignInHost, type SignInOptions } from '@sponsorcoin/merit-wallet';

const KEY = 'merit.mfaFactors.v1';
const OPTIONS_KEY = 'merit.signInOptions.v1';

export interface MfaFactors {
  totpSecret?: string;
  passkeys?: PasskeyRegistration[];
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const defaultStore = (): Store | undefined => (typeof window === 'undefined' ? undefined : window.localStorage);

function readJson<T>(key: string, fallback: T, storage: Pick<Storage, 'getItem'> | undefined): T {
  try {
    const raw = storage?.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readMfaFactors(storage: Pick<Storage, 'getItem'> | undefined = defaultStore()): MfaFactors {
  return readJson<MfaFactors>(KEY, {}, storage);
}

export function readSignInOptions(storage: Pick<Storage, 'getItem'> | undefined = defaultStore()): SignInOptions {
  return readJson<SignInOptions>(OPTIONS_KEY, { passkey: false, totp: false }, storage);
}

function writeSignInOption(key: keyof SignInOptions, on: boolean, storage: Store | undefined = defaultStore()): void {
  storage?.setItem(OPTIONS_KEY, JSON.stringify({ ...readSignInOptions(storage), [key]: on }));
}

/** Setting a step up also switches it on (a passkey added at first run must be used at unlock). */
export async function enrollTotp(secret: string, storage: Store | undefined = defaultStore()): Promise<void> {
  storage?.setItem(KEY, JSON.stringify({ ...readMfaFactors(storage), totpSecret: secret }));
  writeSignInOption('totp', true, storage);
}

export async function enrollPasskey(registration: PasskeyRegistration, storage: Store | undefined = defaultStore()): Promise<void> {
  const current = readMfaFactors(storage);
  storage?.setItem(KEY, JSON.stringify({ ...current, passkeys: [...(current.passkeys ?? []).filter((p) => p.credentialId !== registration.credentialId), registration] }));
  writeSignInOption('passkey', true, storage);
}

export const signInHost: SignInHost = {
  options: () => readSignInOptions(),
  setOption: (key, on) => writeSignInOption(key, on),
  enrolled: () => {
    const factors = readMfaFactors();
    return { passkey: (factors.passkeys?.length ?? 0) > 0, totp: !!factors.totpSecret };
  },
  verifyTotp: async (code) => {
    const secret = readMfaFactors().totpSecret;
    return !!secret && verifyTotp(secret, code);
  },
  verifyPasskey: () => assertPasskey((readMfaFactors().passkeys ?? []).map((p) => p.credentialId), navigator.credentials),
};

export const meritSecuritySetup: SecuritySetupHost = {
  enrollTotp: (secret) => enrollTotp(secret),
  enrollPasskey: (registration) => enrollPasskey(registration),
  credentials: typeof navigator === 'undefined' ? undefined : navigator.credentials,
  accountLabel: 'Merit Wallet (Extension)',
  signIn: signInHost,
};
