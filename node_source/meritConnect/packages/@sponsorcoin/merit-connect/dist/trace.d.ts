export type TraceFn = (event: string, detail: Record<string, unknown>) => void;
export type Trace = (event: string, detail?: Record<string, unknown>) => void;
/** Wrap the host's trace function. A sink that throws must never break a wallet request, so its failure is dropped here, and ONLY here. */
export declare function createTrace(sink?: TraceFn): Trace;
