const RECENT_MS = 30000;
let current = null;
let nextId = 1;
let lastKey = '';
let lastAt = 0;
const listeners = new Set();
export const accountNoticeStore = {
    publish(message, addresses = []) {
        const key = `${message}|${addresses.map((a) => a.toLowerCase()).join(',')}`;
        const now = Date.now();
        if (key === lastKey && now - lastAt < RECENT_MS)
            return;
        lastKey = key;
        lastAt = now;
        current = { id: nextId++, message, addresses };
        listeners.forEach((listener) => listener());
    },
    get: () => current,
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    /** For tests. */
    reset() {
        current = null;
        nextId = 1;
        lastKey = '';
        lastAt = 0;
        listeners.clear();
    },
};
