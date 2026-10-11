import { unlockErrorText } from './walletLock';
/** The API for the active account, or undefined when its backend can reveal neither the key nor the phrase (then there is nothing to show). */
export function createWalletSecurityApi(wallet, activeAddress) {
    // With no active account yet, any backend that can reveal counts: the section then shows its own 'select an account first' hint, as it always did.
    const canKey = wallet.can('revealKey', activeAddress);
    const canPhrase = wallet.can('revealPhrase', activeAddress);
    if (!canKey && !canPhrase)
        return undefined;
    const api = {
        async revealPrivateKey(password, address) {
            const vault = wallet.vaultFor(address);
            if (!vault || !wallet.can('revealKey', address))
                throw new Error('This account is held by a wallet that cannot show its private key.');
            try {
                return await vault.revealPrivateKey({ kind: 'password', value: password }, address);
            }
            catch (error) {
                throw new Error(unlockErrorText(error));
            }
        },
    };
    if (canPhrase) {
        api.revealPhrase = async (password) => {
            const vault = activeAddress ? wallet.vaultFor(activeAddress) : undefined;
            if (!vault)
                throw new Error('This account is held by a wallet that has no recovery phrase to show.');
            try {
                return await vault.revealRecoveryPhrase({ kind: 'password', value: password });
            }
            catch (error) {
                throw new Error(unlockErrorText(error));
            }
        };
    }
    return api;
}
