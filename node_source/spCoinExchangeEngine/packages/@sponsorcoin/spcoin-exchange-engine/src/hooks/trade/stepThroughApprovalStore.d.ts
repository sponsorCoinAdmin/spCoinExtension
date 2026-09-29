export declare const stepThroughApprovalStore: {
    get: () => boolean;
    set: (value: boolean) => void;
    subscribe: (listener: () => void) => (() => void);
    getSnapshot: () => boolean;
    getServerSnapshot: () => boolean;
};
