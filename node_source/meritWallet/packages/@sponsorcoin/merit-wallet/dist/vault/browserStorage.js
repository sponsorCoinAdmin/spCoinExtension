function request(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'));
    });
}
export function createIndexedDbVaultStorage(options = {}) {
    const dbName = options.dbName ?? 'merit-wallet-vault';
    const storeName = options.storeName ?? 'vault';
    const key = options.key ?? 'vault';
    let opened;
    const open = () => {
        const factory = options.factory ?? globalThis.indexedDB;
        if (!factory)
            return Promise.reject(new Error('This browser has no IndexedDB, so a browser wallet cannot be kept here.'));
        opened ?? (opened = new Promise((resolve, reject) => {
            const req = factory.open(dbName, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(storeName))
                    req.result.createObjectStore(storeName);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                opened = undefined;
                reject(req.error ?? new Error('Could not open the wallet database.'));
            };
        }));
        return opened;
    };
    const store = async (mode) => (await open()).transaction(storeName, mode).objectStore(storeName);
    return {
        async read() {
            const value = await request((await store('readonly')).get(key));
            return value ?? undefined;
        },
        async write(vault) {
            await request((await store('readwrite')).put(vault, key));
        },
        async clear() {
            await request((await store('readwrite')).delete(key));
        },
    };
}
/** The unlocked session between page loads, in sessionStorage (or any Storage-shaped object). */
export function createWebSessionStore(storage, key = 'merit-wallet-session') {
    const area = () => storage ?? globalThis.sessionStorage;
    return {
        async get() {
            try {
                const raw = area()?.getItem(key);
                return raw ? JSON.parse(raw) : undefined;
            }
            catch {
                return undefined;
            }
        },
        async set(value) {
            try {
                area()?.setItem(key, JSON.stringify(value));
            }
            catch {
                /* storage full or blocked: the wallet simply asks for the password after a reload */
            }
        },
        async clear() {
            try {
                area()?.removeItem(key);
            }
            catch {
                /* nothing to clear */
            }
        },
    };
}
