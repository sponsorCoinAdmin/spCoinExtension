export declare const popupActiveStore: {
    get(): boolean;
    set(value: boolean): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): boolean;
    getServerSnapshot(): boolean;
};
