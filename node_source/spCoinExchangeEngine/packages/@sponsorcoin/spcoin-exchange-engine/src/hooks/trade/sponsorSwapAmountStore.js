let state = 0n;
const listeners = new Set<() => void>();
function emit() {
    for (const listener of listeners)
        listener();
}
export const sponsorSwapAmountStore = {
    get() {
        return state;
    },
    set(value) {
        if (state === value)
            return;
        state = value;
        emit();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot() {
        return state;
    },
    getServerSnapshot() {
        return 0n;
    },
};
