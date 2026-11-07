import { type Authenticator, type AuthenticatorId } from './authenticator';
export declare function onInjectedWalletChanged(listener: () => void): () => void;
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
    /** The wallet's own name and short badge (Authenticator.displayName / badge). */
    displayName?: string;
    badge?: string;
    icon?: string;
    /** Find the wallet's provider now: undefined when it is not installed. */
    getProvider(): InjectedProvider | undefined | Promise<InjectedProvider | undefined>;
    /** 2026-11-03: the request connect() sends. Default eth_requestAccounts (the wallet's account picker). The Merit extension takes merit_requestConnection: a plain "connect this site?" confirmation, no account choice. */
    connectMethod?: string;
}
/** EIP-1193 / JSON-RPC error codes -> the wallet's error set. Anything not recognised is rethrown as it came. */
export declare function translateProviderError(error: unknown, id: AuthenticatorId, label: string): unknown;
export declare function createInjectedAuthenticator({ id, label, displayName, badge, icon, getProvider, connectMethod }: InjectedAuthenticatorOptions): Authenticator;
