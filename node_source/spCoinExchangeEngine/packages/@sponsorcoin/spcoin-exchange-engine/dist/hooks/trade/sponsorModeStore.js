// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/sponsorModeStore.ts
//
// 2026-09-25, moved from the parent app's lib/store/sponsorModeStore.ts
// (on request, "migrate useSponsorMode") — on direct, verified check.
// Genuinely portable: a plain module-level pub-sub singleton, zero
// web-app/Next.js-specific dependency (only uses a Set of listeners and a
// primitive). Each consumer that imports this package gets its own
// independent instance, the same "independent instances for free" shape as
// the panel-tree singletons moved in Stage 9.
export const sponsorModeStore = {
    _mode: 'SPONSOR',
    _listeners: new Set(),
    get: () => sponsorModeStore._mode,
    set: (m) => {
        if (sponsorModeStore._mode !== m) {
            sponsorModeStore._mode = m;
            sponsorModeStore._listeners.forEach((fn) => fn());
        }
    },
    reset: () => {
        if (sponsorModeStore._mode !== 'SPONSOR') {
            sponsorModeStore._mode = 'SPONSOR';
            sponsorModeStore._listeners.forEach((fn) => fn());
        }
    },
    subscribe: (fn) => {
        sponsorModeStore._listeners.add(fn);
        return () => sponsorModeStore._listeners.delete(fn);
    },
    getSnapshot: () => sponsorModeStore._mode,
    getServerSnapshot: () => 'SPONSOR',
};
