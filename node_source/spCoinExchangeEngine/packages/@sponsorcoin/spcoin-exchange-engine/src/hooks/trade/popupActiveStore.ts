// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/popupActiveStore.ts
// 2026-09-28, moved from the parent app's lib/store/sponsorPopupActiveStore.ts
// Backing store for the SPONSOR "Add New Sponsorship" flow's popupActive state.
// True from the instant "Add New Sponsorship" is clicked until the flow is fully
// acknowledged/cancelled. Session-only (no localStorage persistence).
// Genuinely portable: plain module-level pub-sub singleton, zero web-app coupling.

let state = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const popupActiveStore = {
  get(): boolean {
    return state;
  },
  set(value: boolean) {
    if (state === value) return;
    state = value;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): boolean {
    return state;
  },
  getServerSnapshot(): boolean {
    return false;
  },
};
