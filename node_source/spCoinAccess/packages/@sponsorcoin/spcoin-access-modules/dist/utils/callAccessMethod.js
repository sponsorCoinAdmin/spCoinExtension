export async function callAccessMethod(methodName, runner, lifecycle = {}) {
    if (lifecycle.isActive?.()) {
        lifecycle.onAlreadyActive?.(methodName);
        return undefined;
    }
    const runState = {
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
