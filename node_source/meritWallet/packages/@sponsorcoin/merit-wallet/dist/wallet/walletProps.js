// File: src/wallet/walletProps.tsx
//
// 2026-10-11 (docs/authenticationDesign.txt section 15.7, item W1b) -- how the component uses the `wallet` a host passes. deriveWalletProps turns the Wallet into the props the component used to receive one by one
// (the lock screen, the lock button, the authentication type, the security section); mergeWalletProps lets the host's own props WIN (an explicit prop beats a derived default, so a host can move over one prop at a
// time) and then removes the screens the account's backend cannot support (no delete-wallet or change-password button for a backend that has neither). Pure functions, tested without React; the hook is a thin wrapper.
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import WalletSecuritySection from '../WalletSecuritySection';
import { AuthenticationType } from '../auth/authenticationType';
import { createWalletLockStore } from './walletLock';
import { createWalletSecurityApi } from './walletSecurity';
export const ALL_WALLET_DERIVATIONS = ['lock', 'logoff', 'authType', 'security'];
export function authenticationTypeOf(backendId) {
    if (!backendId)
        return undefined;
    return backendId === 'serverKeystore' ? AuthenticationType.KEYSTORE : AuthenticationType.VAULT;
}
export function deriveWalletProps(input) {
    const { wallet, lock, lockStore, activeAddress } = input;
    const derives = new Set(input.derives ?? ALL_WALLET_DERIVATIONS);
    const out = {};
    if (lock.phase === 'locked' || lock.phase === 'unlocked') {
        if (derives.has('lock')) {
            out.walletLocked = lock.phase === 'locked';
            out.passwordMode = 'unlock';
            out.onPasswordSubmit = (password) => void lockStore.submit(password);
            out.passwordErrorText = lock.error;
            out.passwordSubmitting = lock.submitting;
        }
        if (derives.has('logoff'))
            out.onConfigLogoff = () => void lockStore.lock();
    }
    const type = authenticationTypeOf(lock.backendId);
    if (type && derives.has('authType'))
        out.authenticationType = type;
    if (derives.has('security')) {
        const security = createWalletSecurityApi(wallet, activeAddress);
        if (security)
            out.configSecurityPanelContent = React.createElement(WalletSecuritySection, { api: security });
    }
    return out;
}
/** The host's own (defined) props win over the derived ones; then the screens the account's backend cannot support are removed. */
export function mergeWalletProps(host, derived, wallet, activeAddress) {
    const merged = { ...derived };
    for (const [key, value] of Object.entries(host))
        if (value !== undefined)
            merged[key] = value;
    const out = merged;
    if (wallet) {
        if (out.onConfigDeleteWallet && !wallet.can('deleteWallet', activeAddress))
            out.onConfigDeleteWallet = undefined;
        if (out.onConfigResetPassword && !wallet.can('changeCredential', activeAddress))
            out.onConfigResetPassword = undefined;
    }
    return out;
}
const versions = new WeakMap();
function walletVersion(wallet) {
    if (!wallet)
        return 0;
    if (!versions.has(wallet)) {
        versions.set(wallet, 0);
        wallet.onChange(() => versions.set(wallet, (versions.get(wallet) ?? 0) + 1));
    }
    return versions.get(wallet) ?? 0;
}
/** The component's wrapper uses this: the wallet's lock store and the derived props, refreshed when the wallet or the lock changes. */
export function useWalletDerivedProps(wallet, activeAddress, derives) {
    const store = useMemo(() => (wallet ? createWalletLockStore(wallet) : undefined), [wallet]);
    useEffect(() => () => store?.dispose(), [store]);
    const lock = useSyncExternalStore((listener) => (store ? store.subscribe(listener) : () => undefined), () => store?.getState(), () => store?.getState());
    // Recomputed when the wallet announces a change (accounts, backends) so the can() answers stay current.
    const version = useSyncExternalStore((listener) => (wallet ? wallet.onChange(listener) : () => undefined), () => walletVersion(wallet), () => walletVersion(wallet));
    return useMemo(() => (wallet && store && lock ? deriveWalletProps({ wallet, lock, lockStore: store, activeAddress, derives }) : {}), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet, store, lock, activeAddress, version, derives]);
}
