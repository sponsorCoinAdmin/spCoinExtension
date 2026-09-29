// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = buildHandler('getRecipientRateKeys', async (context) => {
  const method =
    getDynamicMethod(context.read, 'getRecipientRateKeys')
    || getDynamicMethod(context.staking, 'getRecipientRateKeys')
    || getDynamicMethod(context.contract, 'getRecipientRateKeys')
    || getDynamicMethod(context.read, 'getSponsorRecipientRates')
    || getDynamicMethod(context.staking, 'getSponsorRecipientRates')
    || getDynamicMethod(context.contract, 'getSponsorRecipientRates')
    || getDynamicMethod(context.read, 'getSponsorRecipientRateKeys')
    || getDynamicMethod(context.staking, 'getSponsorRecipientRateKeys')
    || getDynamicMethod(context.contract, 'getSponsorRecipientRateKeys')
    || getDynamicMethod(context.read, 'getRecipientRateList')
    || getDynamicMethod(context.staking, 'getRecipientRateList')
    || getDynamicMethod(context.contract, 'getRecipientRateList');
  if (!method) {
    throw new Error('SpCoin read method getRecipientRateKeys is not available on access modules or contract.');
  }
  return method(...context.methodArgs);
});
export default handler;

