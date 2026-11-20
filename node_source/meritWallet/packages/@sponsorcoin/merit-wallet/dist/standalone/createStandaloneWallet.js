// File: src/standalone/createStandaloneWallet.ts
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the STAND-ALONE wallet's core: everything a plain browser page needs to hold keys, with no server and no host app. It assembles pieces this package already has
// (the encrypted vault over IndexedDB, the unlocked session in sessionStorage, the vault authenticator, the approval queue, the wallet that ties them together) behind ONE call, so a developer passes only the chains.
// Pure TypeScript: no React, no DOM at import time (the browser APIs are looked up when the vault is first used), so it is testable under node with small fakes.
//
// Layer 1 (this file): create / import / restore a wallet, unlock, lock, accounts. Signing goes through `approvals` (nothing signs until a screen approves); the approval screen, balances and sending come in the next layers.
import { createAuthenticatorRegistry } from '../auth/resolve';
import { ApprovalController } from '../vault/approvals';
import { createIndexedDbVaultStorage, createWebSessionStore } from '../vault/browserStorage';
import { createLocalVaultParts } from '../vault/vaultCapability';
import { createVaultAuthenticator } from '../vault/vaultAuthenticator';
import { createWallet } from '../wallet/wallet';
export const STANDALONE_AUTO_LOCK_MS = 15 * 60000;
export function createStandaloneWallet(options) {
    if (!options.chains?.length)
        throw new Error('A stand-alone wallet needs at least one chain: { chainId, rpcUrl }.');
    const chains = options.chains;
    const parts = createLocalVaultParts({
        storage: options.storage ?? createIndexedDbVaultStorage(options.namespace ? { dbName: `${options.namespace}-vault` } : {}),
        sessionStore: options.sessionStore ?? createWebSessionStore(undefined, options.namespace ? `${options.namespace}-session` : undefined),
        label: 'this browser',
        platform: 'web',
        autoLockMs: options.autoLockMs ?? STANDALONE_AUTO_LOCK_MS,
    });
    const approvals = new ApprovalController();
    // Adding, importing or removing an account changes the account list, but the vault only announces lock and unlock. The wallet redraws its account list on an authenticator announcement, so the vault's account methods are wrapped to make one.
    const accountListeners = new Set();
    const announceAccounts = () => accountListeners.forEach((l) => l());
    for (const method of ['addAccount', 'importKey', 'removeAccount', 'importPhrase', 'create', 'importBackup', 'setActive']) {
        const original = parts.vault[method];
        if (!original)
            continue;
        parts.vault[method] = async (...args) => {
            const result = await original.apply(parts.vault, args);
            announceAccounts();
            return result;
        };
    }
    const baseAuthenticator = createVaultAuthenticator({
        id: 'browserVault',
        label: 'Browser',
        parts,
        approvals,
        rpcUrlFor: (chainId) => chains.find((c) => c.chainId === chainId)?.rpcUrl,
        origin: 'wallet',
    });
    const authenticator = {
        ...baseAuthenticator,
        onChange(listener) {
            const offBase = baseAuthenticator.onChange(listener);
            const onAccounts = () => listener('accountsChanged');
            accountListeners.add(onAccounts);
            return () => {
                offBase();
                accountListeners.delete(onAccounts);
            };
        },
    };
    const registry = createAuthenticatorRegistry();
    registry.register(authenticator);
    const wallet = createWallet({ registry, appDefault: () => 'browserVault' });
    let restored;
    const { vault } = parts;
    return {
        chains,
        vault,
        parts,
        authenticator,
        wallet,
        approvals,
        onboarding: {
            createWallet: async (password) => ({ recoveryPhrase: (await vault.create({ kind: 'password', value: password })).recoveryPhrase }),
            importWallet: async (recoveryPhrase, password) => {
                await vault.importPhrase(recoveryPhrase, { kind: 'password', value: password });
            },
            restoreBackup: async (file, password) => {
                await vault.importBackup(file, { kind: 'password', value: password });
            },
        },
        restore: () => (restored ?? (restored = parts.session.restore().catch(() => false))),
    };
}
