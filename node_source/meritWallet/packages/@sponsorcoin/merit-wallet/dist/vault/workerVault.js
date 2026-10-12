// File: src/vault/workerVault.ts
//
// 2026-10-11 (docs/authenticationDesign.txt section 15.7, item W1c) -- the VaultCapability (vaultCapability.ts) for a vault that lives in ANOTHER context and is reached by messages: the extension's background
// worker owns the VaultSession and the accounts (walletBackground.ts) and the side panel talks to it with the `merit/vault/*` and `merit/accounts/*` messages. This adapter turns those messages into the one
// VaultCapability interface, so the extension's vault is passed to the wallet exactly like the browser vault or a phone's store, with no change to the worker. A phone app with a native key manager behind a bridge
// would implement the same transport.
//
// The interface asks a few things synchronously (isUnlocked, accounts, activeAddress), so the adapter keeps the last state the worker reported (every reply carries `unlocked`; the worker also broadcasts
// `merit/vault/changed`). `ready` resolves after the first read; `refresh()` re-reads on demand. Only the password credential exists in the worker today (PIN and biometric are 'unsupported').
import { BACKUP_FORMAT, VaultError, parseBackupFile } from './vaultCapability';
/** The worker's error codes mapped onto the one VaultError set. */
export function workerError(reply) {
    const text = reply.message ?? '';
    const code = /already exists|already set up/i.test(text) ? 'already_set_up'
        : reply.error === 'wrong-password' ? 'wrong_credential'
            : reply.error === 'too-many-attempts' ? 'locked_out'
                : reply.error === 'locked' ? 'locked'
                    : reply.error === 'forbidden' ? 'unsupported'
                        : reply.error === 'invalid-request' && /at least \d+ characters/i.test(text) ? 'weak_credential'
                            : reply.error === 'invalid-request' && /recovery phrase|mnemonic/i.test(text) ? 'invalid_phrase'
                                : reply.error === 'invalid-request' && /private key/i.test(text) ? 'invalid_key'
                                    : reply.error === 'invalid-request' && /already/i.test(text) ? 'already_set_up'
                                        : 'unsupported';
    const seconds = /(\d+)\s*seconds?/i.exec(text);
    return new VaultError(code, text || (code === 'wrong_credential' ? 'Incorrect password.' : 'The wallet could not do that.'), code === 'locked_out' ? (seconds ? Number(seconds[1]) * 1000 : 30000) : undefined);
}
const password = (credential) => {
    if (credential.kind !== 'password')
        throw new VaultError('unsupported', 'This wallet opens with a password.');
    return credential.value;
};
const toAccount = (a) => ({
    address: a.address,
    name: a.name ?? '',
    source: a.source === 'imported' ? 'imported' : 'generated',
    devOrigin: !!a.devOrigin,
});
export function createWorkerVault(transport, options = {}) {
    let initialized = false;
    let unlocked = false;
    let accountList = [];
    let active;
    const listeners = new Set();
    const notify = () => listeners.forEach((l) => l());
    const absorb = (reply) => {
        if (typeof reply.initialized === 'boolean')
            initialized = reply.initialized;
        if (typeof reply.unlocked === 'boolean')
            unlocked = reply.unlocked;
        if (Array.isArray(reply.accounts))
            accountList = reply.accounts.map(toAccount);
        if (typeof reply.active === 'string')
            active = reply.active;
    };
    const call = async (message) => {
        let reply;
        try {
            reply = await transport.send(message);
        }
        catch (error) {
            throw new VaultError('unsupported', error instanceof Error ? error.message : 'The wallet could not be reached.');
        }
        if (!reply || !reply.ok)
            throw workerError(reply ?? { ok: false });
        const before = unlocked;
        absorb(reply);
        if (before !== unlocked)
            notify();
        return reply;
    };
    const refresh = async () => {
        try {
            await call({ type: 'merit/vault/status' });
            if (unlocked)
                await call({ type: 'merit/accounts/list' });
            else
                accountList = [];
        }
        catch {
            /* worker not reachable: keep the last state */
        }
        notify();
    };
    const ready = refresh();
    transport.subscribe((message) => {
        if (message?.type !== 'merit/vault/changed')
            return;
        if (typeof message.unlocked === 'boolean')
            unlocked = message.unlocked;
        void refresh();
    });
    const vault = {
        label: options.label ?? 'this device',
        platform: options.platform ?? 'extension',
        capabilities: { create: true, importPhrase: true, importKey: true, backup: true, changeCredential: true, delete: true, revealKey: true, revealPhrase: true, biometric: false },
        ready,
        refresh,
        async hasWallet() {
            await ready;
            return initialized;
        },
        isUnlocked: () => unlocked,
        async create(credential) {
            const reply = await call({ type: 'merit/vault/create', password: password(credential) });
            await call({ type: 'merit/accounts/list' });
            notify();
            return { recoveryPhrase: String(reply.mnemonic ?? ''), accounts: accountList };
        },
        async importPhrase(phrase, credential) {
            await call({ type: 'merit/vault/create', password: password(credential), mnemonic: phrase });
            await call({ type: 'merit/accounts/list' });
            notify();
            return accountList;
        },
        async importKey(privateKey, name) {
            const reply = await call({ type: 'merit/accounts/importPrivateKey', privateKey, name });
            await call({ type: 'merit/accounts/list' });
            notify();
            if (!reply.account)
                throw new VaultError('invalid_key', 'That private key could not be imported.');
            return toAccount(reply.account);
        },
        async addAccount(name) {
            const reply = await call({ type: 'merit/accounts/addDerived', name });
            await call({ type: 'merit/accounts/list' });
            notify();
            if (!reply.account)
                throw new VaultError('locked', 'The wallet is locked.');
            return toAccount(reply.account);
        },
        async setActive(address) {
            await call({ type: 'merit/accounts/setActive', address });
            active = address;
            notify();
        },
        activeAddress: () => active,
        async unlock(credential) {
            await call({ type: 'merit/vault/unlock', password: password(credential) });
            await call({ type: 'merit/accounts/list' });
            notify();
        },
        lock() {
            unlocked = false;
            accountList = [];
            notify();
            void transport.send({ type: 'merit/vault/lock' }).catch(() => undefined);
        },
        accounts: () => accountList,
        async changeCredential(current, next) {
            if (password(current) === password(next))
                throw new VaultError('same_credential', 'The new password must differ from the current one.');
            await call({ type: 'merit/vault/changePassword', oldPassword: password(current), newPassword: password(next) });
        },
        async deleteWallet(credential) {
            await call({ type: 'merit/vault/verifyPassword', password: password(credential) });
            await call({ type: 'merit/vault/wipe' });
            accountList = [];
            active = undefined;
            notify();
        },
        async exportBackup(credential) {
            await call({ type: 'merit/vault/verifyPassword', password: password(credential) });
            const reply = await call({ type: 'merit/vault/exportBackup' });
            if (!reply.backup)
                throw new VaultError('not_set_up', 'There is no wallet to back up.');
            return JSON.stringify({ format: BACKUP_FORMAT, version: 1, vault: reply.backup });
        },
        async importBackup(file, credential) {
            const backup = parseBackupFile(file);
            await call({ type: 'merit/vault/importBackup', vault: backup, password: password(credential) });
            await call({ type: 'merit/accounts/list' });
            notify();
            return accountList;
        },
        async revealPrivateKey(credential, address) {
            const reply = await call({ type: 'merit/accounts/exportPrivateKey', password: password(credential), address });
            return String(reply.privateKey ?? '');
        },
        async revealRecoveryPhrase(credential) {
            const reply = await call({ type: 'merit/accounts/revealMnemonic', password: password(credential) });
            return String(reply.mnemonic ?? '');
        },
        onChange(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    return vault;
}
