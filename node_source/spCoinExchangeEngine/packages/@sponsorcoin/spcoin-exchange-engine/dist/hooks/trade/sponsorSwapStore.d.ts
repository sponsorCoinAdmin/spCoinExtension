export declare const sponsorSwapStore: {
    _swapped: boolean;
    _listeners: Set<() => void>;
    get: () => boolean;
    toggle: () => void;
    reset: () => void;
    subscribe: (fn: () => void) => (() => void);
    getSnapshot: () => boolean;
    getServerSnapshot: () => boolean;
};
