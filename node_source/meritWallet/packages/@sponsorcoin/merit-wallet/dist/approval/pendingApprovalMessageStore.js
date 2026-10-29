let state = null;
const listeners = new Set();
export const pendingApprovalMessageStore = {
    set(next) {
        state = next;
        listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot() {
        return state;
    },
    getServerSnapshot() {
        return null;
    },
};
