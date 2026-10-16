export declare function useCopyFeedback(ms?: number): {
    copiedKey: string | null;
    copied: boolean;
    copy: (text: string, key?: string) => void;
};
