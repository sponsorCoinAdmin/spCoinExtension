// File: src/wallet/walletLock.ts
//
// 2026-10-11 (docs/authenticationDesign.txt section 15.7, item W1b) -- the lock screen's state, DERIVED FROM THE WALLET: whichever key-keeping backend already has a wallet (Wallet.primaryVault) decides whether
// the wallet is locked, takes the password, and locks again. A host that passes `wallet` to the component no longer wires walletLocked / onPasswordSubmit / passwordErrorText / passwordSubmitting / onConfigLogoff
// by hand. A wallet with no key-keeping backend (MetaMask only, a hardware wallet) has no lock screen at all: its own approval popups are the gate. Setting a wallet up (the recovery-phrase screens) stays the host's.
// A store, not a hook, so it is testable without React; useWalletLock (walletProps.ts) wraps it for the component. MetaMask: KeyringController isUnlocked / submitPassword / setLocked.
import { VaultError } from '../vault/vaultCapability';
/** The wording for each way an unlock can fail (the same words in every host). */
export function unlockErrorText(error) {
    if (error instanceof VaultError) {
        if (error.code === 'wrong_credential')
            return 'Incorrect password.';
        if (error.code === 'locked_out') {
            const seconds = Math.max(1, Math.ceil((error.retryAfterMs ?? 0) / 1000));
            return `Too many incorrect passwords. Wait ${seconds} second${seconds === 1 ? '' : 's'} and try again.`;
        }
        if (error.code === 'not_set_up')
            return 'No wallet has been set up yet.';
        return error.message || 'Could not unlock the wallet.';
    }
    return error instanceof Error && error.message ? error.message : 'Could not unlock the wallet.';
}
export function createWalletLockStore(wallet) {
    let state = { phase: 'checking', submitting: false };
    const listeners = new Set();
    const set = (next) => {
        state = { ...state, ...next };
        listeners.forEach((l) => l());
    };
    let vaultOff;
    let watchedVault;
    const refresh = async () => {
        const primary = await wallet.primaryVault();
        if (!primary) {
            // No wallet yet: setup is possible when some backend can create one; otherwise this host has no lock screen.
            const anyCanCreate = wallet.can('createWallet') || wallet.can('importPhrase');
            if (watchedVault) {
                vaultOff?.();
                vaultOff = undefined;
                watchedVault = undefined;
            }
            set({ phase: anyCanCreate ? 'setup' : 'none', where: undefined, backendId: undefined });
            return;
        }
        if (watchedVault !== primary.vault) {
            vaultOff?.();
            watchedVault = primary.vault;
            vaultOff = primary.vault.onChange(() => { void refresh(); });
        }
        set({ phase: primary.vault.isUnlocked() ? 'unlocked' : 'locked', where: primary.vault.label, backendId: primary.authenticator.id });
    };
    const walletOff = wallet.onChange(() => { void refresh(); });
    void refresh();
    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        refresh,
        async submit(password) {
            if (state.submitting)
                return false;
            const primary = await wallet.primaryVault();
            if (!primary) {
                set({ error: 'No wallet has been set up yet.' });
                return false;
            }
            set({ submitting: true, error: undefined });
            try {
                const credential = (password === undefined || password === '') && primary.vault.capabilities.biometric ? { kind: 'biometric', value: '' } : { kind: 'password', value: password ?? '' };
                await primary.vault.unlock(credential);
                set({ submitting: false, error: undefined, phase: 'unlocked', where: primary.vault.label, backendId: primary.authenticator.id });
                return true;
            }
            catch (error) {
                set({ submitting: false, error: unlockErrorText(error) });
                return false;
            }
        },
        async lock() {
            const primary = await wallet.primaryVault();
            primary?.vault.lock();
            await refresh();
        },
        dispose() {
            walletOff();
            vaultOff?.();
        },
    };
}
