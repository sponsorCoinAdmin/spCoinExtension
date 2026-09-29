export declare const stepThroughApprovalStore: {
    get(): boolean;
    set(value: boolean): void;
    subscribe(listener: () => void): () => boolean;
    getSnapshot(): boolean;
    getServerSnapshot(): boolean;
};
