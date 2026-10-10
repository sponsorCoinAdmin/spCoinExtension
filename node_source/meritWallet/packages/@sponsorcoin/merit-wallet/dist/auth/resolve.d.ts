import { type AccountAuthenticatorRef, type Authenticator, type AuthenticatorId } from './authenticator';
export interface AuthenticatorRegistry {
    /** Registers (or replaces) the authenticator with this id. Returns an unregister function. */
    register(authenticator: Authenticator): () => void;
    unregister(id: string): void;
    get(id: string): Authenticator | undefined;
    list(): Authenticator[];
    /** Called when the set of registered authenticators changes. Returns the unsubscribe function. */
    onChange(listener: () => void): () => void;
}
export declare function createAuthenticatorRegistry(): AuthenticatorRegistry;
/** Which authenticator id a given account should use. Pure; does not look at the registry. */
export declare function chooseAuthenticatorId(account: AccountAuthenticatorRef, appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined): AuthenticatorId | undefined;
export interface ResolveParams {
    registry: AuthenticatorRegistry;
    account: AccountAuthenticatorRef;
    /** Rule 3: the app default (web app: serverKeystore for the Hardhat accounts it holds, the injected wallet for connected ones; extension: localVault). */
    appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined;
}
/** The authenticator that signs for `account`, or a specific AuthenticatorError explaining why there is none. Never falls back to another authenticator. */
export declare function resolveAuthenticator({ registry, account, appDefault }: ResolveParams): Promise<Authenticator>;
/**
 * The one-time migration of the old per-NETWORK setting (authSourceByChain: 'merit' | 'metamask') into per-ACCOUNT assignments (5.2): every account that exists on a network takes that network's
 * source. `chainsOf` says which networks an account exists on; the first chain with a saved source wins, and an account with no saved source is left unassigned (the app default then applies).
 */
export declare function migrateAuthSourceByChain(authSourceByChain: Record<string, 'merit' | 'metamask' | undefined>, accounts: {
    address: string;
    chainIds: number[];
}[]): Record<string, AuthenticatorId>;
