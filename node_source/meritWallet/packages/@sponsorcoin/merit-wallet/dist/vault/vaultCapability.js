// File: src/vault/vaultCapability.ts
//
// 2026-10-11 (docs/design/accountAuthDesign.txt section 14.3, items V1 / V2) -- the VAULT CAPABILITY: what the wallet's panels ask of any place that keeps keys under a credential, written once. The stores differ
// (the extension: chrome.storage.local; a browser: IndexedDB; a phone: Keychain / Keystore with biometrics; the web's dev server keystore); the panels (reset password, remove wallet, reveal key, backup, add account)
// call this one interface and take their wording from `label`. createLocalVault() builds it over the vault that already lives in this folder (VaultSession + WalletAccounts), so ANY host that can supply a
// VaultStorage (ciphertext only) gets the whole capability with no new crypto: the browser vault is this plus an IndexedDB storage. Pure TypeScript over WebCrypto, no React and no DOM.
//
// The credential is not assumed to be a password: { kind: 'password' | 'pin' | 'biometric', value }. A local vault opens with a password or a PIN (the value is the secret); 'biometric' is for a host that
// supplies its own unlock (a phone) and is refused here with 'unsupported'.
import { WrongPasswordError } from './vaultCrypto';
import { TooManyAttemptsError, VaultLockedError, VaultSession } from './vaultSession';
import { WalletAccountError, WalletAccounts, createWallet } from './walletAccounts';
/** The one error set every vault reports in. `retryAfterMs` is set for 'locked_out'. */
export class VaultError extends Error {
    constructor(code, message, retryAfterMs) {
        super(message);
        this.name = 'VaultError';
        this.code = code;
        this.retryAfterMs = retryAfterMs;
    }
}
export const MIN_PASSWORD_LENGTH = 8;
export const MIN_PIN_LENGTH = 4;
export const BACKUP_FORMAT = 'merit-vault-backup';
/** The backup file's own version (the vault inside has its own, see vaultCrypto). */
export const BACKUP_FILE_VERSION = 1;
/** Bounds on the key-derivation work a backup file may ask for: a hostile file must not be able to stall the page with billions of rounds. */
export const MIN_BACKUP_ITERATIONS = 1;
export const MAX_BACKUP_ITERATIONS = 5000000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** Read a backup file and check its shape BEFORE any key is derived. Throws invalid_backup (not a backup, damaged, or from a newer version). Nothing here decrypts: a wrong password and a tampered ciphertext both fail later as wrong_credential. */
export function parseBackupFile(file) {
    const notBackup = () => new VaultError('invalid_backup', 'That file is not a wallet backup.');
    let parsed;
    try {
        parsed = JSON.parse(file);
    }
    catch {
        throw notBackup();
    }
    if (!parsed || typeof parsed !== 'object' || parsed.format !== BACKUP_FORMAT)
        throw notBackup();
    if (typeof parsed.version === 'number' && parsed.version > BACKUP_FILE_VERSION)
        throw new VaultError('invalid_backup', 'That backup was made by a newer version of the wallet. Update the wallet to restore it.');
    if (parsed.version !== BACKUP_FILE_VERSION)
        throw notBackup();
    const v = parsed.vault;
    if (!v || typeof v !== 'object' || Array.isArray(v))
        throw notBackup();
    const text = (x) => typeof x === 'string' && x.length > 0 && BASE64.test(x);
    if (typeof v.version !== 'number' || typeof v.algorithm !== 'string')
        throw notBackup();
    if (typeof v.iterations !== 'number' || !Number.isInteger(v.iterations) || v.iterations < MIN_BACKUP_ITERATIONS || v.iterations > MAX_BACKUP_ITERATIONS)
        throw new VaultError('invalid_backup', 'That backup file is damaged.');
    if (!text(v.salt) || !text(v.iv) || !text(v.data))
        throw new VaultError('invalid_backup', 'That backup file is damaged.');
    return v;
}
function secretOf(credential, forNew) {
    if (credential.kind === 'biometric')
        throw new VaultError('unsupported', 'This vault opens with a password or a PIN.');
    const value = String(credential.value ?? '');
    if (forNew) {
        const min = credential.kind === 'pin' ? MIN_PIN_LENGTH : MIN_PASSWORD_LENGTH;
        if (value.length < min)
            throw new VaultError('weak_credential', `A ${credential.kind} must be at least ${min} characters.`);
    }
    return value;
}
function mapError(error) {
    if (error instanceof VaultError)
        throw error;
    if (error instanceof WrongPasswordError)
        throw new VaultError('wrong_credential', 'Incorrect password.');
    if (error instanceof TooManyAttemptsError)
        throw new VaultError('locked_out', error.message, error.retryAfterMs);
    if (error instanceof VaultLockedError)
        throw new VaultError('locked', 'The wallet is locked.');
    if (error instanceof WalletAccountError) {
        const m = error.message;
        if (/recovery phrase is not valid/i.test(m))
            throw new VaultError('invalid_phrase', m);
        if (/64 hexadecimal|already in this wallet/i.test(m))
            throw new VaultError('invalid_key', m);
        if (/not in this wallet/i.test(m))
            throw new VaultError('unknown_account', m);
        throw new VaultError('unsupported', m);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/No vault/i.test(message))
        throw new VaultError('not_set_up', 'The wallet has not been set up yet.');
    if (/already exists/i.test(message))
        throw new VaultError('already_set_up', 'A wallet already exists here.');
    throw error;
}
const toAccount = (a) => ({ address: a.address, name: a.name, source: a.source, devOrigin: a.devOrigin });
/** The whole vault capability over a VaultStorage (ciphertext only): the extension passes chrome.storage, a browser IndexedDB, a test a Map. */
export function createLocalVault(options) {
    return createLocalVaultParts(options).vault;
}
/** Like createLocalVault, but also returns the session and the accounts (for createVaultAuthenticator). */
export function createLocalVaultParts(options) {
    const session = new VaultSession(options);
    const wallet = new WalletAccounts(session);
    const guard = async (run) => {
        try {
            return await run();
        }
        catch (error) {
            return mapError(error);
        }
    };
    const list = () => wallet.list().map(toAccount);
    const vault = {
        label: options.label ?? 'this device',
        platform: options.platform,
        capabilities: { create: true, importPhrase: true, importKey: true, backup: true, changeCredential: true, delete: true, revealKey: true, revealPhrase: true, biometric: false },
        hasWallet: () => session.isInitialized(),
        isUnlocked: () => session.isUnlocked(),
        create: (credential) => guard(async () => {
            const secret = secretOf(credential, true);
            const { mnemonic } = await createWallet(session, secret);
            return { recoveryPhrase: mnemonic, accounts: list() };
        }),
        importPhrase: (phrase, credential) => guard(async () => {
            const secret = secretOf(credential, true);
            await createWallet(session, secret, { mnemonic: phrase });
            return list();
        }),
        importKey: (privateKey, name) => guard(async () => toAccount(await wallet.importPrivateKey(privateKey, name))),
        addAccount: (name) => guard(async () => toAccount(await wallet.addDerived(name))),
        setActive: (address) => guard(() => wallet.setActive(address)),
        activeAddress: () => {
            try {
                return wallet.activeAddress();
            }
            catch {
                return undefined;
            }
        },
        unlock: (credential) => guard(() => session.unlock(secretOf(credential, false))),
        lock: () => session.lock(),
        accounts: () => {
            try {
                return list();
            }
            catch (error) {
                return mapError(error);
            }
        },
        changeCredential: (current, next) => guard(async () => {
            const from = secretOf(current, false);
            const to = secretOf(next, true);
            if (from === to)
                throw new VaultError('same_credential', 'The new password must be different from the current password.');
            await session.changePassword(from, to);
        }),
        deleteWallet: (credential) => guard(async () => {
            await session.verifyPassword(secretOf(credential, false));
            await session.wipe();
        }),
        exportBackup: (credential) => guard(async () => {
            await session.verifyPassword(secretOf(credential, false));
            return JSON.stringify({ format: BACKUP_FORMAT, version: 1, vault: await session.exportBackup() });
        }),
        importBackup: (file, credential) => guard(async () => {
            const backupVault = parseBackupFile(file);
            await session.importBackup(backupVault, secretOf(credential, false));
            return list();
        }),
        revealPrivateKey: (credential, address) => guard(async () => wallet.revealPrivateKey(secretOf(credential, false), address)),
        revealRecoveryPhrase: (credential) => guard(async () => wallet.revealMnemonic(secretOf(credential, false))),
        onChange: (listener) => session.onChange(listener),
    };
    return { vault, session, accounts: wallet };
}
