// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/sponsorSwapAmountStore.ts
// 2026-09-28, moved from the parent app's lib/store/sponsorSwapAmountStore.ts
// Carries the SPONSOR resume flow's real swap output (spCoin amount) across
// ExchangeButton's unmount/remount between the swap step and the stake step.
// Session-only (no localStorage persistence).
// Genuinely portable: plain module-level pub-sub singleton, zero web-app coupling.

let state = 0n;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const sponsorSwapAmountStore = {
  get(): bigint {
    return state;
  },
  set(value: bigint) {
    if (state === value) return;
    state = value;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): bigint {
    return state;
  },
  getServerSnapshot(): bigint {
    return 0n;
  },
};
