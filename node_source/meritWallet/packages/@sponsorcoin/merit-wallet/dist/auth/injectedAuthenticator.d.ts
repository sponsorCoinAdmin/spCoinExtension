import { type Authenticator, type AuthenticatorId } from './authenticator';
export interface InjectedProvider {
    request(args: {
        method: string;
        params?: unknown;
    }): Promise<unknown>;
    on?(event: string, listener: (...args: unknown[]) => void): unknown;
    removeListener?(event: string, listener: (...args: unknown[]) => void): unknown;
}
export interface InjectedAuthenticatorOptions {
    id: AuthenticatorId;
    label: string;
    icon?: string;
    /** Find the wallet's provider now: undefined when it is not installed. */
    getProvider(): InjectedProvider | undefined | Promise<InjectedProvider | undefined>;
}
/** EIP-1193 / JSON-RPC error codes -> the wallet's error set. Anything not recognised is rethrown as it came. */
export declare function translateProviderError(error: unknown, id: AuthenticatorId, label: string): unknown;
export declare function createInjectedAuthenticator({ id, label, icon, getProvider }: InjectedAuthenticatorOptions): Authenticator;
