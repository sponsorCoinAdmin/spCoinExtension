export interface AccessMethodCallOptions {
    executionSignal: AbortSignal;
    executionLabel: string;
}
export type AccessMethodRunner<T> = (options: AccessMethodCallOptions) => Promise<T> | T;
export interface AccessMethodRunState {
    runId: number;
    methodName: string;
    startedAt: number;
    controller: AbortController;
}
export interface AccessMethodLifecycle {
    isActive?: () => boolean;
    onAlreadyActive?: (methodName: string) => void;
    onStart?: (runState: AccessMethodRunState) => void;
    onFinish?: (runState: AccessMethodRunState) => void;
    nextRunId?: () => number;
    now?: () => number;
}
export type AccessMethodCaller = <T>(methodName: string, runner: AccessMethodRunner<T>) => Promise<T | undefined>;
export declare function callAccessMethod<T>(methodName: string, runner: AccessMethodRunner<T>, lifecycle?: AccessMethodLifecycle): Promise<T | undefined>;
