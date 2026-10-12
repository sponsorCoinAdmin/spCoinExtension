import { AuthenticatorError } from '../auth/authenticator';
import { VaultError } from './vaultCapability';
export class PhoneAuthError extends Error {
    constructor(code, message, retryAfterMs) {
        super(message);
        this.name = 'PhoneAuthError';
        this.code = code;
        this.retryAfterMs = retryAfterMs;
    }
}
const toVaultAccount = (a) => ({ address: a.address, name: a.name ?? '', source: 'generated', devOrigin: false });
function authToVaultError(error) {
    if (error instanceof VaultError)
        throw error;
    if (error instanceof PhoneAuthError) {
        if (error.code === 'locked_out')
            throw new VaultError('locked_out', error.message || 'Too many failed attempts. Try again later.', error.retryAfterMs);
        if (error.code === 'failed')
            throw new VaultError('wrong_credential', error.message || 'That did not match.');
        if (error.code === 'unavailable')
            throw new VaultError('unsupported', error.message || 'Biometric unlock is not available on this device.');
        throw new VaultError('locked', error.message || 'Unlock was cancelled.');
    }
    throw error instanceof Error ? error : new Error(String(error));
}
/** The phone's key manager as a VaultCapability. The credential is always a biometric / device unlock: the manager shows the prompt, so the credential's value is ignored. */
export function createPhoneVault(manager, options = {}) {
    const biometric = (credential) => {
        if (credential.kind !== 'biometric')
            throw new VaultError('unsupported', 'A phone wallet opens with Face ID, a fingerprint or the device passcode.');
    };
    return {
        label: 'this phone',
        platform: options.platform,
        capabilities: { create: true, importPhrase: false, importKey: false, backup: false, changeCredential: false, delete: true, revealKey: false, revealPhrase: false, biometric: true },
        hasWallet: () => manager.isSetUp(),
        isUnlocked: () => manager.isUnlocked(),
        async create(credential) {
            biometric(credential);
            if (await manager.isSetUp())
                throw new VaultError('already_set_up', 'A wallet already exists on this phone.');
            try {
                await manager.authenticate('Create your wallet');
                const made = await manager.setUp();
                return { recoveryPhrase: made.recoveryPhrase ?? '', accounts: made.accounts.map(toVaultAccount) };
            }
            catch (error) {
                return authToVaultError(error);
            }
        },
        async importPhrase() { throw new VaultError('unsupported', 'A phone wallet cannot be set up from a recovery phrase here.'); },
        async importKey() { throw new VaultError('unsupported', 'A phone wallet keeps its keys inside the secure element: importing a key is not possible.'); },
        async addAccount(name) {
            if (!manager.isUnlocked())
                throw new VaultError('locked', 'The wallet is locked.');
            try {
                return toVaultAccount(await manager.addAccount(name));
            }
            catch (error) {
                return authToVaultError(error);
            }
        },
        async setActive() { },
        activeAddress: () => undefined,
        async unlock(credential) {
            biometric(credential);
            if (!(await manager.isSetUp()))
                throw new VaultError('not_set_up', 'No wallet has been set up on this phone yet.');
            try {
                await manager.authenticate('Unlock your wallet');
            }
            catch (error) {
                authToVaultError(error);
            }
        },
        lock: () => manager.lock(),
        accounts: () => (manager.isUnlocked() ? manager.accounts().map(toVaultAccount) : []),
        async changeCredential() { throw new VaultError('unsupported', 'There is no wallet password on a phone: the unlock is the device biometric or passcode.'); },
        async deleteWallet(credential) {
            biometric(credential);
            try {
                await manager.authenticate('Delete your wallet from this phone');
                await manager.deleteWallet();
            }
            catch (error) {
                authToVaultError(error);
            }
        },
        async exportBackup() { throw new VaultError('unsupported', 'A phone wallet cannot be exported to a file: its keys never leave the secure element.'); },
        async importBackup() { throw new VaultError('unsupported', 'A phone wallet cannot be restored from a file here.'); },
        async revealPrivateKey() { throw new VaultError('unsupported', 'A phone wallet cannot show a private key: it never leaves the secure element.'); },
        async revealRecoveryPhrase() { throw new VaultError('unsupported', 'The recovery phrase was shown once, when the wallet was created.'); },
        onChange: (listener) => manager.onChange(listener),
    };
}
/** The phone's key manager as an Authenticator ('deviceVault'). Every signature is behind the key manager's own approval; a locked wallet is an error, not a silent unlock. */
export function createPhoneAuthenticator(manager, options) {
    const vault = createPhoneVault(manager);
    const ensureKnown = (address) => {
        const key = String(address ?? '').toLowerCase();
        if (!manager.accounts().some((a) => a.address.toLowerCase() === key))
            throw new AuthenticatorError('unauthorized', `${address} is not an account of this phone's wallet.`, 'deviceVault');
    };
    const guard = async (run) => {
        if (!manager.isUnlocked())
            throw new AuthenticatorError('locked', 'The wallet is locked. Unlock it with Face ID, a fingerprint or the device passcode.', 'deviceVault');
        try {
            return await run();
        }
        catch (error) {
            if (error instanceof AuthenticatorError)
                throw error;
            if (error instanceof PhoneAuthError)
                throw new AuthenticatorError(error.code === 'cancelled' ? 'user_rejected' : 'locked', error.message, 'deviceVault');
            throw error;
        }
    };
    return {
        id: 'deviceVault',
        label: 'This phone',
        capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: true, importKey: false, lock: true },
        vault,
        async status() {
            return { available: await manager.isAvailable(), unlocked: manager.isUnlocked() };
        },
        async accounts() {
            return manager.isUnlocked() ? manager.accounts().map((a) => ({ address: a.address, name: a.name, source: 'deviceVault' })) : [];
        },
        async signMessage(address, message) {
            return guard(async () => {
                ensureKnown(address);
                return manager.signMessage(address, message);
            });
        },
        async sendTransaction(tx) {
            return guard(async () => {
                ensureKnown(tx.from);
                const raw = await manager.signTransaction(tx);
                return { hash: await options.broadcast(raw, tx.chainId) };
            });
        },
        onChange(listener) {
            return manager.onChange(() => listener(manager.isUnlocked() ? 'unlock' : 'lock'));
        },
    };
}
