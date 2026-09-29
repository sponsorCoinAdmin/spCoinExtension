export declare function usePerfMarks(base: string): {
    start: () => void;
    end: (label?: string) => void;
    time: <T>(label: string, fn: () => T) => T;
};
