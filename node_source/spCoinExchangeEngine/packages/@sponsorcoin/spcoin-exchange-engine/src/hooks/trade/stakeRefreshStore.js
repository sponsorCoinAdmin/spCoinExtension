let tick = 0;
const listeners = new Set<() => void>();
export const stakeRefreshStore = {
    bump() {
        tick += 1;
        for (const listener of listeners)
            listener();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot() {
        return tick;
    },
    getServerSnapshot() {
        return 0;
    },
};
