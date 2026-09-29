// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = buildHandler('getLowerRecipientRate', async (context) => {
    const rangeFn = getDynamicMethod(context.read, 'getRecipientRateRange')
        || getDynamicMethod(context.staking, 'getRecipientRateRange')
        || getDynamicMethod(context.contract, 'getRecipientRateRange');
    if (!rangeFn) {
        throw new Error(`SpCoin read method ${context.selectedMethod} requires getRecipientRateRange.`);
    }
    const range = await rangeFn();
    return range?.[0];
});
export default handler;
