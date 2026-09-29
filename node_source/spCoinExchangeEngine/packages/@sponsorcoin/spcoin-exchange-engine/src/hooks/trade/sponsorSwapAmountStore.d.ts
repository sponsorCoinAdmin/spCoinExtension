export declare const sponsorSwapAmountStore: {
    get: () => bigint;
    set: (value: bigint) => void;
    subscribe: (listener: () => void) => (() => void);
    getSnapshot: () => bigint;
    getServerSnapshot: () => bigint;
};
