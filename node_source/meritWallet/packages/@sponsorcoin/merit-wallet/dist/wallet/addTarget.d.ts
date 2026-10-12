import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet, WalletFeatures } from './wallet';
export interface AddTarget {
    id: AuthenticatorId;
    /** The wallet's one name (walletName). */
    name: string;
    features: WalletFeatures;
}
export interface AddTargets {
    /** Every reachable wallet that keeps keys itself (a signing-only wallet has nothing to add keys to). In registration order. */
    targets: AddTarget[];
    /** The target when the person picked none: the active wallet when it keeps keys, else the first one (the host registers its own wallet first). */
    defaultId: AuthenticatorId | undefined;
}
export type AddKeyEntry = 'createAccount' | 'importAccount' | 'importWallet';
/** How long a wallet may take to say whether it can be reached before the screen goes on without it (a slow wallet must not hold the screen back). */
export declare const TARGET_STATUS_TIMEOUT_MS = 2000;
/**
 * The wallets the Add screen can add to, and which one it starts on. `only` limits the check to the wallets a host can really add keys to (the others are not even asked); each wallet is asked at the same time and
 * one that does not answer within TARGET_STATUS_TIMEOUT_MS is left out, so a slow one never holds the screen back.
 */
export declare function readAddTargets(wallet: Pick<Wallet, 'backends' | 'registry' | 'backendIdFor'>, activeAddress: string | undefined, only?: readonly AuthenticatorId[]): Promise<AddTargets>;
/** The reasons, in the target's own name, why an entry that adds keys cannot be used; an entry the target can do has none. */
export declare function addEntryReasons(target: AddTarget | undefined): Partial<Record<AddKeyEntry, string>>;
