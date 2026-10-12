import { AuthenticationType } from '../auth/authenticationType';
import type { MeritWalletProps } from '../MeritWallet';
import { type WalletLockState, type WalletLockStore } from './walletLock';
import type { Wallet } from './wallet';
export type WalletDerivedProps = Partial<MeritWalletProps>;
/** What a host lets the wallet derive. A host with its own gate (the web app's password panel) leaves 'lock' and 'logoff' out. The delete-wallet / change-password gating always applies. */
export type WalletDerivation = 'lock' | 'logoff' | 'authType' | 'security' | 'accounts' | 'signing';
export declare const ALL_WALLET_DERIVATIONS: readonly WalletDerivation[];
export declare function authenticationTypeOf(backendId: string | undefined): AuthenticationType | undefined;
export declare function deriveWalletProps(input: {
    wallet: Wallet;
    lock: WalletLockState;
    lockStore: Pick<WalletLockStore, 'submit' | 'lock'>;
    activeAddress: string | undefined;
    derives?: readonly WalletDerivation[];
}): WalletDerivedProps;
/** The host's own (defined) props win over the derived ones; then the screens the account's backend cannot support are removed. */
export declare function mergeWalletProps(host: MeritWalletProps, derived: WalletDerivedProps, wallet: Wallet | undefined, activeAddress: string | undefined): MeritWalletProps;
/** The component's wrapper uses this: the wallet's lock store and the derived props, refreshed when the wallet or the lock changes. */
export declare function useWalletDerivedProps(wallet: Wallet | undefined, activeAddress: string | undefined, derives?: readonly WalletDerivation[]): WalletDerivedProps;
