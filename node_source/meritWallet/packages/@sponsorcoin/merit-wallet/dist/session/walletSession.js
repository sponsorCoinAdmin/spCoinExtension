// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/walletSession.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, S3c / table row 15) -- the unlock / lock gate over the wallet API, shared by both apps. MetaMask
// shape (KeyringController): the wallet is in one of four phases -- checking (state not known yet), setup (no wallet yet: choose a password),
// locked (a wallet exists: enter the password), unlocked. This module owns the rules that used to be written twice (the web app's inline handlers
// in MeritWallet.tsx and the extension's per-account prompt): password length and match, the "Incorrect password." message, busy flag, and what
// the password screen shows. What differs per host is the ADAPTER: web = its keystore routes through walletState; extension = the vault in the
// background worker. No React in this file; useWalletSession (walletSessionReact.ts) is the hook.
export const MIN_WALLET_PASSWORD_LENGTH = 8;
export function passwordModeFor(phase) {
    return phase === 'checking' ? 'checking' : phase === 'setup' ? 'setup' : 'unlock';
}
export function phaseFromStatus(status) {
    if (!status)
        return 'checking';
    if (!status.initialized)
        return 'setup';
    return status.unlocked ? 'unlocked' : 'locked';
}
/**
 * The password screen's submit, without any host state: validates, then calls the adapter. Used directly by a host that keeps its own busy and
 * error state (the web app), and by the controller below.
 */
export async function submitWalletPassword(phase, adapter, password, confirmPassword) {
    try {
        if (phase === 'setup') {
            if (password.length < MIN_WALLET_PASSWORD_LENGTH)
                return { ok: false, error: `Password must be at least ${MIN_WALLET_PASSWORD_LENGTH} characters.` };
            if (password !== confirmPassword)
                return { ok: false, error: 'Passwords do not match.' };
            const created = await adapter.create(password);
            return { ok: true, ...(created && created.recoveryPhrase ? { recoveryPhrase: created.recoveryPhrase } : {}) };
        }
        if (phase === 'locked') {
            if (!password)
                return { ok: false, error: 'Enter your password.' };
            return (await adapter.unlock(password)) ? { ok: true } : { ok: false, error: 'Incorrect password.' };
        }
        return { ok: false, error: 'The wallet is not ready for a password yet.' };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'The wallet could not complete that.' };
    }
}
export function createWalletSession(adapter, onChange = () => undefined) {
    let state = { phase: 'checking', error: '', submitting: false };
    const set = (patch) => {
        state = { ...state, ...patch };
        onChange();
    };
    return {
        getState: () => state,
        async refresh() {
            try {
                set({ phase: phaseFromStatus(await adapter.status()) });
            }
            catch {
                set({ phase: 'checking' });
            }
        },
        async submit(password, confirmPassword) {
            if (state.submitting)
                return;
            set({ submitting: true, error: '' });
            const result = await submitWalletPassword(state.phase, adapter, password, confirmPassword);
            if (!result.ok) {
                set({ submitting: false, error: result.error });
                return;
            }
            // A new wallet keeps its recovery phrase until the user confirms; either way it is now unlocked.
            set({ submitting: false, phase: 'unlocked', error: '', ...(result.recoveryPhrase ? { recoveryPhrase: result.recoveryPhrase } : {}) });
        },
        async lock() {
            if (!adapter.lock)
                return;
            await adapter.lock();
            set({ phase: 'locked', error: '', recoveryPhrase: undefined });
        },
        dismissRecoveryPhrase() {
            set({ recoveryPhrase: undefined });
        },
    };
}
