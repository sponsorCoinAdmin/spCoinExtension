// @ts-nocheck
import { buildHandler, getDynamicMethod, runDynamicMethod } from '../../readMethodRuntime';

// Calling rangeFn()/lowerFn()/upperFn() directly (no args) dropped
// context.readCacheOptions entirely, so a caller's explicit Cache Mode
// (e.g. forceRefresh) was silently ignored and this always fell back to
// the method's default cached TTL. runDynamicMethod threads readCacheOptions
// through correctly for whichever target (read/staking/contract) actually
// resolves the method, so use it instead of invoking the resolved fn bare.
async function readRateRange(context, rangeMethod, lowerMethod, upperMethod) {
    const hasRangeMethod = getDynamicMethod(context.read, rangeMethod)
        || getDynamicMethod(context.staking, rangeMethod)
        || getDynamicMethod(context.contract, rangeMethod);
    if (hasRangeMethod) {
        return runDynamicMethod(context, rangeMethod);
    }

    const hasLowerMethod = getDynamicMethod(context.read, lowerMethod)
        || getDynamicMethod(context.staking, lowerMethod)
        || getDynamicMethod(context.contract, lowerMethod);
    const hasUpperMethod = getDynamicMethod(context.read, upperMethod)
        || getDynamicMethod(context.staking, upperMethod)
        || getDynamicMethod(context.contract, upperMethod);
    if (!hasLowerMethod || !hasUpperMethod) {
        throw new Error(`SpCoin read method ${context.selectedMethod} is not available on access modules or contract.`);
    }

    const [lower, upper] = await Promise.all([
        runDynamicMethod(context, lowerMethod),
        runDynamicMethod(context, upperMethod),
    ]);
    return [lower, upper];
}

const handler = buildHandler('getAgentRateRange', (context) =>
    readRateRange(context, 'getAgentRateRange', 'getLowerAgentRate', 'getUpperAgentRate'),
);
export default handler;

