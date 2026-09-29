export declare const swapCompletedStore: {
    get(): boolean;
    set(value: boolean): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): boolean;
    getServerSnapshot(): boolean;
};
