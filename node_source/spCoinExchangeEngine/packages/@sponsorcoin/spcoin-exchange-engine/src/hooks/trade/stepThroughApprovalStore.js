let state = false;
const listeners = new Set<() => void>();
function emit() {
    for (const listener of listeners)
        listener();
}
export const stepThroughApprovalStore = {
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
        return false;
    },
};
