export declare const sponsorSwapAmountStore: {
    get(): bigint;
    set(value: bigint): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): bigint;
    getServerSnapshot(): bigint;
};
