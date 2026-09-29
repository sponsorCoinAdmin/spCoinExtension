// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/swapCompletedStore.ts
// 2026-09-28, moved from the parent app's lib/store/sponsorSwapCompletedStore.ts
// Second resume checkpoint for the SPONSOR "Add New Sponsorship" flow — true
// once doSponsorSwap() has succeeded and its receipt read. Distinct from
// popupActiveStore (which stays true through the whole approve->swap->stake chain).
// Session-only (no localStorage persistence).
// Genuinely portable: plain module-level pub-sub singleton, zero web-app coupling.

let state = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const swapCompletedStore = {
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
