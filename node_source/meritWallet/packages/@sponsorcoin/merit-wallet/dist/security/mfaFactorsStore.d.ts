import type { SecuritySetupHost } from '../SecuritySetupScreen';
import { type PasskeyRegistration } from './passkey';
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
export declare function createSecuritySetup(parts: MfaFactorsHostParts): SecuritySetupHost;
