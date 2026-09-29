// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/stakeRefreshStore.ts
// 2026-09-28, moved from the parent app's lib/store/stakeRefreshStore.ts
// Bumped after a stake/un-stake transaction confirms so components with a
// cache-through balance fetch know to re-fetch. Same external-store pattern as
// autoRefreshStore/sponsorSwapStore. Genuinely portable.

let tick = 0;
const listeners = new Set<() => void>();

export const stakeRefreshStore = {
  bump() {
    tick += 1;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): number {
    return tick;
  },
  getServerSnapshot(): number {
    return 0;
  },
};
