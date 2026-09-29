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

export type AccessMethodCaller = <T>(
    methodName: string,
    runner: AccessMethodRunner<T>,
) => Promise<T | undefined>;

export async function callAccessMethod<T>(
    methodName: string,
    runner: AccessMethodRunner<T>,
    lifecycle: AccessMethodLifecycle = {},
): Promise<T | undefined> {
    if (lifecycle.isActive?.()) {
        lifecycle.onAlreadyActive?.(methodName);
        return undefined;
    }

    const runState: AccessMethodRunState = {
        runId: lifecycle.nextRunId?.() ?? Date.now(),
        methodName,
        startedAt: lifecycle.now?.() ?? Date.now(),
        controller: new AbortController(),
    };

    lifecycle.onStart?.(runState);

    try {
        return await runner({
            executionSignal: runState.controller.signal,
            executionLabel: methodName,
        });
    }
    finally {
        lifecycle.onFinish?.(runState);
    }
}
