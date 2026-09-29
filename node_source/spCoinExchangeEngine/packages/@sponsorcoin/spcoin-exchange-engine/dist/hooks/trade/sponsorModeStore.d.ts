import type { SponsorMode } from './useSponsorMode';
export declare const sponsorModeStore: {
    _mode: SponsorMode;
    _listeners: Set<() => void>;
    get: () => SponsorMode;
    set: (m: SponsorMode) => void;
    reset: () => void;
    subscribe: (fn: () => void) => (() => void);
    getSnapshot: () => SponsorMode;
    getServerSnapshot: () => SponsorMode;
};
