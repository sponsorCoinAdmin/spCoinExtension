import type { Authenticator } from '../auth/authenticator';
import type { AuthenticatorRegistry } from '../auth/resolve';
/** Every backend that lists the address, connected or not (knownAccounts when it has it). */
export declare function holdersOf(registry: AuthenticatorRegistry, address: string): Promise<Authenticator[]>;
/** The row opened (groupId) decides which holder the removal is about; omitted, the local (key-keeping) holder wins. */
export declare function removalTarget(holders: Authenticator[], groupId?: string): {
    opened?: Authenticator;
    isLocal: boolean;
};
