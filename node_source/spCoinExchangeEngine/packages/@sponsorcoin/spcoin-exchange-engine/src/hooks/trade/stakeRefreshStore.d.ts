export declare const stakeRefreshStore: {
    bump: () => void;
    subscribe: (listener: () => void) => (() => void);
    getSnapshot: () => number;
    getServerSnapshot: () => number;
};
