// File: src/security/mfaFactorsStore.ts
//
// 2026-11-14 (CI: method-duplication found enrollPasskey and readJson in BOTH the web app and the extension): the ONE implementation of where a host keeps the sign-in options and the enrolled second steps (authenticator app
// secret, passkeys). It was a copy in each app (components/wallet/lib/mfaFactors.ts and the extension's src/mfaFactors.ts). Each host now only supplies what differs: its key-value storage, its device passkey store and the
// name shown in the authenticator app. Browser storage only: nothing is sent to the Merit server; the unlock screen asks for a step when it is switched on AND set up (the password remains the vault key).
import type { SecuritySetupHost } from '../SecuritySetupScreen';
import { assertPasskey, type PasskeyRegistration } from './passkey';
import type { SignInHost, SignInOptions } from './signInOptions';
import { verifyTotp } from './totp';

const KEY = 'merit.mfaFactors.v1';
const OPTIONS_KEY = 'merit.signInOptions.v1';

export interface MfaFactors {
  totpSecret?: string;
  passkeys?: PasskeyRegistration[];
}

export type MfaStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface MfaFactorsHostParts {
  /** The host's synchronous key-value storage (undefined when it has none: nothing is kept). Read when used, so a host can hand it out late. */
  storage(): MfaStorage | undefined;
  /** The device's passkey store (the browser's navigator.credentials); undefined: the passkey is not offered. */
  credentials(): CredentialsContainer | undefined;
  /** The name shown in the authenticator app and the passkey list, e.g. 'Merit Wallet (Web App)'. */
  accountLabel: string;
}

export function createSecuritySetup(parts: MfaFactorsHostParts): SecuritySetupHost {
  const readJson = <T,>(key: string, fallback: T): T => {
    try {
      const raw = parts.storage()?.getItem(key);
      return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const readFactors = (): MfaFactors => readJson<MfaFactors>(KEY, {});
  const readOptions = (): SignInOptions => readJson<SignInOptions>(OPTIONS_KEY, { passkey: false, totp: false });
  const writeOption = (key: keyof SignInOptions, on: boolean): void => {
    parts.storage()?.setItem(OPTIONS_KEY, JSON.stringify({ ...readOptions(), [key]: on }));
  };

  const signIn: SignInHost = {
    options: readOptions,
    setOption: writeOption,
    enrolled: () => {
      const factors = readFactors();
      return { passkey: (factors.passkeys?.length ?? 0) > 0, totp: !!factors.totpSecret };
    },
    verifyTotp: async (code) => {
      const secret = readFactors().totpSecret;
      return !!secret && verifyTotp(secret, code);
    },
    verifyPasskey: async () => {
      const credentials = parts.credentials();
      if (!credentials) throw new Error('This device has no passkey store.');
      return assertPasskey((readFactors().passkeys ?? []).map((p) => p.credentialId), credentials);
    },
  };

  return {
    // Setting a step up also switches it on (a passkey added at first run must be used at unlock).
    enrollTotp: async (secret) => {
      parts.storage()?.setItem(KEY, JSON.stringify({ ...readFactors(), totpSecret: secret }));
      writeOption('totp', true);
    },
    enrollPasskey: async (registration) => {
      const current = readFactors();
      parts.storage()?.setItem(KEY, JSON.stringify({ ...current, passkeys: [...(current.passkeys ?? []).filter((p) => p.credentialId !== registration.credentialId), registration] }));
      writeOption('passkey', true);
    },
    get credentials() {
      return parts.credentials();
    },
    accountLabel: parts.accountLabel,
    signIn,
  };
}
