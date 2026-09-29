// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = buildHandler('getRecipientRateAgentKeys', async (context) => {
  const method =
    getDynamicMethod(context.read, 'getRecipientRateAgentKeys')
    || getDynamicMethod(context.staking, 'getRecipientRateAgentKeys')
    || getDynamicMethod(context.contract, 'getRecipientRateAgentKeys')
    || getDynamicMethod(context.read, 'getRecipientRateAgentList')
    || getDynamicMethod(context.staking, 'getRecipientRateAgentList')
    || getDynamicMethod(context.contract, 'getRecipientRateAgentList');
  if (!method) {
    throw new Error('SpCoin read method getRecipientRateAgentKeys is not available on access modules or contract.');
  }
  return method(...context.methodArgs);
});
export default handler;

