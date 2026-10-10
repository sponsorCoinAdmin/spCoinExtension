import { type WalletPasswordMode, type WalletSessionAdapter, type WalletSessionState } from './walletSession';
export interface UseWalletSessionResult extends WalletSessionState {
    passwordMode: WalletPasswordMode;
    onPasswordSubmit: (password: string, confirmPassword: string) => void;
    refresh: () => Promise<void>;
    lock: () => Promise<void>;
    dismissRecoveryPhrase: () => void;
}
export declare function useWalletSession(adapter: WalletSessionAdapter): UseWalletSessionResult;
