import type { ConnectionState, WalletConnections } from './walletAuthenticators';
type AuthenticatorId = string;
export interface UseWalletConnections {
    states: Readonly<Record<AuthenticatorId, ConnectionState>>;
    isConnected: (id: AuthenticatorId) => boolean | undefined;
    refresh: (id?: AuthenticatorId) => Promise<void>;
}
export declare function useWalletConnections(store: WalletConnections): UseWalletConnections;
export {};
