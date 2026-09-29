// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/stepThroughApprovalStore.ts
// 2026-09-28, moved from the parent app's lib/store/stepThroughApprovalStore.ts
// Footprint checkbox on the SPONSOR "Add New Sponsorship" button (see
// ExchangeButton.tsx). Opts this run INTO the manual-advance debug gate
// (debugManualAdvanceGate.ts); unchecked (default) skips straight to receipt.
// Genuinely portable: plain module-level pub-sub singleton, zero web-app coupling.
let state = false;
const listeners = new Set();
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
