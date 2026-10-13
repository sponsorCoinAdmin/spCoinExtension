// File: src/wallet/wallet.ts
//
// 2026-10-11 (docs/design/accountAuthDesign.txt section 15.7, item W1a) -- THE WALLET: the one object a host hands the wallet component for its key backends. Every backend is an Authenticator (src/auth/authenticator.ts):
// the dev keystore, the extension vault, the browser vault, a phone's key management system, an injected wallet such as MetaMask, a hardware device. A backend that keeps keys itself carries the optional
// `vault` capability (src/vault/vaultCapability.ts) and so supports create / import / backup / change credential / delete / reveal; a signing-only backend (MetaMask, hardware, a delegated app) has none of those.
// Modelled on MetaMask's KeyringController: ONE controller, many keyring types, the address as the only join key.
//
//   registry        which backends this host has (register / unregister / list)
//   store           each ACCOUNT's saved active backend (owners own accounts, not networks); the resolver reads it first
//   authenticatorFor(account)   the backend that signs for an account; fails with a specific error, never falls back to another backend
//   accounts()      the accounts of every backend, each once, with the backend that signs for it (an address held by two backends is one row that names both)
//   can(feature, address?)   whether the backend for that account (or any backend) supports a screen or action; the wallet draws screens from this, so a signing-only backend shows none of the key-management screens
//   primaryVault()  the first key-keeping backend that already has a wallet (the one the lock screen and the Config tab drive)
//
// MORE THAN ONE BACKEND AT ONCE IS NORMAL (owner decision 2026-10-11): vault accounts and MetaMask accounts live in one list and each signs through its own backend. No browser globals here: the host passes
// its storage in as the `store`.
import { authenticatorBadge, walletName, } from '../auth/authenticator';
import { createAuthenticatorRegistry, resolveAuthenticator } from '../auth/resolve';
export function createMemoryActiveAuthenticatorStore(initial = {}) {
    const map = new Map(Object.entries(initial).map(([k, v]) => [k.toLowerCase(), v]));
    return {
        get: (address) => map.get(String(address ?? '').toLowerCase()),
        set: (address, id) => {
            const key = String(address ?? '').toLowerCase();
            if (id)
                map.set(key, id);
            else
                map.delete(key);
        },
    };
}
export const WALLET_FEATURES = [
    'createWallet', 'importPhrase', 'importKey', 'addAccount', 'backup', 'changeCredential', 'deleteWallet', 'revealKey', 'revealPhrase', 'biometric', 'signTypedData', 'lock',
];
/** What one backend supports, from its own capability flags (the vault flags when it keeps keys, the signing flags always). */
export function featuresOf(authenticator) {
    const c = authenticator.capabilities;
    const v = authenticator.vault?.capabilities;
    return {
        createWallet: !!v?.create,
        importPhrase: !!v?.importPhrase,
        importKey: !!(v?.importKey ?? c.importKey),
        addAccount: !!(authenticator.vault ? v?.create : c.createAccount),
        backup: !!v?.backup,
        changeCredential: !!v?.changeCredential,
        deleteWallet: !!v?.delete,
        revealKey: !!v?.revealKey,
        revealPhrase: !!v?.revealPhrase,
        biometric: !!v?.biometric,
        signTypedData: !!c.signTypedData,
        lock: !!c.lock,
    };
}
function infoOf(authenticator) {
    return {
        id: authenticator.id,
        label: authenticator.label,
        badge: authenticatorBadge(authenticator.id),
        name: walletName(authenticator.id, authenticator.vault?.platform),
        keepsKeys: !!authenticator.vault,
        where: authenticator.vault?.label ?? '',
        features: featuresOf(authenticator),
    };
}
export function createWallet(options) {
    const registry = options.registry ?? createAuthenticatorRegistry();
    const store = options.store ?? createMemoryActiveAuthenticatorStore();
    const listeners = new Set();
    const notify = () => listeners.forEach((l) => l());
    // Each registered backend's own announcements are forwarded while it is registered.
    const forwards = new Map();
    const attach = (authenticator) => {
        forwards.get(authenticator.id)?.();
        forwards.set(authenticator.id, authenticator.onChange(() => notify()));
    };
    registry.list().forEach(attach);
    registry.onChange(() => {
        const live = new Set(registry.list().map((a) => a.id));
        for (const [id, off] of [...forwards]) {
            if (!live.has(id)) {
                off();
                forwards.delete(id);
            }
        }
        registry.list().forEach((a) => { if (!forwards.has(a.id))
            attach(a); });
        notify();
    });
    const refOf = (account) => ({
        address: account.address,
        activeAuthenticator: store.get(account.address),
        sourceAuthenticator: account.sourceAuthenticator,
    });
    const backendIdFor = (address) => store.get(address) ?? options.appDefault({ address });
    return {
        registry,
        register: (authenticator) => registry.register(authenticator),
        unregister: (id) => registry.unregister(id),
        backendIdFor,
        backends: () => registry.list().map(infoOf),
        backend: (id) => {
            const a = registry.get(id);
            return a ? infoOf(a) : undefined;
        },
        async authenticatorFor(account) {
            return resolveAuthenticator({ registry, account: refOf(account), appDefault: options.appDefault });
        },
        setActiveAuthenticator(address, id) {
            store.set(address, id);
            notify();
        },
        getActiveAuthenticator: (address) => store.get(address),
        async accounts() {
            const byAddress = new Map();
            for (const authenticator of registry.list()) {
                let listed = [];
                try {
                    listed = await authenticator.accounts();
                }
                catch {
                    continue;
                }
                for (const account of listed) {
                    const key = String(account.address ?? '').toLowerCase();
                    if (!key)
                        continue;
                    const existing = byAddress.get(key);
                    if (existing) {
                        existing.backends.push(authenticator.id);
                        existing.name ?? (existing.name = account.name);
                        continue;
                    }
                    byAddress.set(key, { ...account, authenticatorId: authenticator.id, badge: authenticatorBadge(authenticator.id), backends: [authenticator.id] });
                }
            }
            // The saved choice wins over "the first backend that listed it", when that backend is one of the ones holding the address.
            for (const [key, entry] of byAddress) {
                const saved = store.get(key);
                if (saved && entry.backends.includes(saved)) {
                    entry.authenticatorId = saved;
                    entry.badge = authenticatorBadge(saved);
                }
            }
            return [...byAddress.values()];
        },
        can(feature, address) {
            if (address) {
                const id = backendIdFor(address);
                const a = id ? registry.get(id) : undefined;
                return a ? featuresOf(a)[feature] : false;
            }
            return registry.list().some((a) => featuresOf(a)[feature]);
        },
        vaultFor(address) {
            const id = backendIdFor(address);
            return id ? registry.get(id)?.vault : undefined;
        },
        async primaryVault() {
            for (const authenticator of registry.list()) {
                const vault = authenticator.vault;
                if (!vault)
                    continue;
                try {
                    if (await vault.hasWallet())
                        return { authenticator, vault };
                }
                catch {
                    /* a vault that cannot answer is not the primary one */
                }
            }
            return undefined;
        },
        onChange(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
