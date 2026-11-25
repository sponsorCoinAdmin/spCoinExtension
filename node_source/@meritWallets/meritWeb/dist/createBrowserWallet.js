// File: src/createBrowserWallet.ts
//
// 2026-11-18 (docs/design/standAloneWalletInstall.txt) -- the BROWSER wallet's core: everything a plain browser page needs to hold keys, with no server and no host app. It assembles pieces this package already has
// (the encrypted vault over IndexedDB, the unlocked session in sessionStorage, the vault authenticator, the approval queue, the wallet that ties them together) behind ONE call, so a developer passes only the chains.
// Pure TypeScript: no React, no DOM at import time (the browser APIs are looked up when the vault is first used), so it is testable under node with small fakes.
//
// Signing goes through `approvals` (nothing signs until a screen approves; the approval page is useBrowserApproval.ts). The engine hooks, the data snapshot, send and swap are the other files of this package.
import { createAuthenticatorRegistry, createIndexedDbVaultStorage, createLocalVaultParts, createVaultAuthenticator, createWallet, createWebSessionStore } from '@sponsorcoin/merit-wallet';
import { ApprovalController } from '@sponsorcoin/merit-wallet/vault';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
export const BROWSER_AUTO_LOCK_MS = 15 * 60000;
export function createBrowserWallet(options) {
    if (!options.chains?.length)
        throw new Error('A stand-alone wallet needs at least one chain: { chainId, rpcUrl }.');
    const chains = options.chains;
    const parts = createLocalVaultParts({
        storage: options.storage ?? createIndexedDbVaultStorage(options.namespace ? { dbName: `${options.namespace}-vault` } : {}),
        sessionStore: options.sessionStore ?? createWebSessionStore(undefined, options.namespace ? `${options.namespace}-session` : undefined),
        label: 'this browser',
        platform: 'web',
        autoLockMs: options.autoLockMs ?? BROWSER_AUTO_LOCK_MS,
    });
    const approvals = new ApprovalController();
    // Adding, importing or removing an account changes the account list, but the vault only announces lock and unlock. The wallet redraws its account list on an authenticator announcement, so the vault's account methods are wrapped to make one.
    const accountListeners = new Set();
    const announceAccounts = () => accountListeners.forEach((l) => l());
    // deleteWallet is announced too: the wallet then returns to its first-run setup screen
    for (const method of ['addAccount', 'importKey', 'removeAccount', 'importPhrase', 'create', 'importBackup', 'setActive', 'deleteWallet']) {
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
        // 2026-11-20 (owner report: picking a network did nothing): a chain the page did not list is read through the network registry's endpoint, so a network chosen from the list works
        rpcUrlFor: (chainId) => chains.find((c) => c.chainId === chainId)?.rpcUrl ?? getNetworkConfiguration(chainId)?.rpcUrl,
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
        announceAccountsChanged: announceAccounts,
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
