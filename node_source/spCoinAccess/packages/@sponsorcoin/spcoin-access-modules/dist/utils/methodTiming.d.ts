export interface OnChainCallTiming {
    method: string;
    onChainRunTimeMs: number;
    broadcastMs?: string;
    receiptWaitMs?: string;
    gasUsed?: string;
    gasPriceWei?: string;
    feePaidWei?: string;
    feePaidEth?: string;
}
export interface OnChainCalls {
    calls: OnChainCallTiming[];
    totalOnChainMs: number;
}
export type MethodTimingMeta = {
    startedAt: string;
    completedAt: string;
    totalRunTimeMs: number;
    offChainRunTimeMs: number;
    onChainRunTimeMs: number;
    onChainCallCount: number;
    onChainCalls: OnChainCalls;
};
export interface MethodTimingCollector {
    startedAtMs: number;
    onChainCalls: OnChainCallTiming[];
    recordOnChainCall: (method: string, runTimeMs: number) => void;
}
export declare function createMethodTimingCollector(startedAtMs?: number): MethodTimingCollector;
export declare function runWithMethodTimingCollector<T>(collector: MethodTimingCollector, callback: () => Promise<T>): Promise<T>;
export declare function timeOnChainCall<T>(method: string, callback: () => Promise<T>): Promise<T>;
export declare function buildReceiptGasTimingFields(tx: unknown, receipt: unknown): Partial<OnChainCallTiming>;
export declare function attachReceiptGasToOnChainCall(collector: MethodTimingCollector | undefined | null, method: string, tx: unknown, receipt: unknown): void;
export declare function buildMethodTimingMeta(collector: MethodTimingCollector, completedAtMs?: number): MethodTimingMeta;
export declare function wrapContractWithTiming<T extends object>(contract: T): T;
