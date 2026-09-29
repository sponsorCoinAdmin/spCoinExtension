export declare const stakeRefreshStore: {
    bump(): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): number;
    getServerSnapshot(): number;
};
