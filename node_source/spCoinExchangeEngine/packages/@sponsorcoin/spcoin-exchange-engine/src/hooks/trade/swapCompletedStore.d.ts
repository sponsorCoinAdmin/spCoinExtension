export declare const swapCompletedStore: {
    get: () => boolean;
    set: (value: boolean) => void;
    subscribe: (listener: () => void) => (() => void);
    getSnapshot: () => boolean;
    getServerSnapshot: () => boolean;
};
