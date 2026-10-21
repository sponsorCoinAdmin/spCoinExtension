/** Never rejects. Resolves when the push has finished (or failed) and the settled approval has been cleared. */
export async function pushContextPatch(host, plan, patch, hooks = {}, source = 'MeritExchangeContext') {
    try {
        const token = await host.ensureSyncToken({ chainId: plan.chainId, activeAccountAddress: plan.address, rpcUrl: plan.rpcUrl });
        const result = await host.pushExchangeContextPatch(plan.key, patch, token, source);
        hooks.onPushed?.(plan.key, result.revision);
    }
    catch (error) {
        try {
            hooks.onFailed?.(error);
        }
        catch {
            // a logging hook must not break the push's own guarantee
        }
    }
    finally {
        host.clearSettledMeritApproval();
    }
}
