// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/sponsorSwapStore.ts
//
// 2026-09-25, moved from the parent app's lib/store/sponsorSwapStore.ts
// (on request, "migrate useSponsorMode") — on direct, verified check.
// Genuinely portable: a plain module-level pub-sub singleton, zero
// web-app/Next.js-specific dependency (matches sponsorModeStore.ts exactly).
export const sponsorSwapStore = {
    _swapped: false,
    _listeners: new Set(),
    get: () => sponsorSwapStore._swapped,
    toggle: () => {
        sponsorSwapStore._swapped = !sponsorSwapStore._swapped;
        sponsorSwapStore._listeners.forEach((fn) => fn());
    },
    reset: () => {
        if (!sponsorSwapStore._swapped)
            return;
        sponsorSwapStore._swapped = false;
        sponsorSwapStore._listeners.forEach((fn) => fn());
    },
    subscribe: (fn) => {
        sponsorSwapStore._listeners.add(fn);
        return () => sponsorSwapStore._listeners.delete(fn);
    },
    getSnapshot: () => sponsorSwapStore._swapped,
    getServerSnapshot: () => false,
};
