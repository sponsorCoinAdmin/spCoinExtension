// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = buildHandler('getLowerAgentRate', async (context) => {
    const rangeFn = getDynamicMethod(context.read, 'getAgentRateRange')
        || getDynamicMethod(context.staking, 'getAgentRateRange')
        || getDynamicMethod(context.contract, 'getAgentRateRange');
    if (!rangeFn) {
        throw new Error(`SpCoin read method ${context.selectedMethod} requires getAgentRateRange.`);
    }
    const range = await rangeFn();
    return range?.[0];
});
export default handler;
