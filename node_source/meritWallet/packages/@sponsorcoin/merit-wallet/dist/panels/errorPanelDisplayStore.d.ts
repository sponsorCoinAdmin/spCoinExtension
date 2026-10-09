export declare const errorPanelDisplayStore: {
    get(): boolean;
    toggle(): void;
    set(next: boolean): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): boolean;
    getServerSnapshot(): boolean;
};
