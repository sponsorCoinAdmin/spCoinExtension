// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = buildHandler('getAgentRateKeys', async (context) => {
  const method =
    getDynamicMethod(context.read, 'getAgentRateKeys')
    || getDynamicMethod(context.staking, 'getAgentRateKeys')
    || getDynamicMethod(context.contract, 'getAgentRateKeys')
    || getDynamicMethod(context.read, 'getAgentRateList')
    || getDynamicMethod(context.staking, 'getAgentRateList')
    || getDynamicMethod(context.contract, 'getAgentRateList');
  if (!method) {
    throw new Error('SpCoin read method getAgentRateKeys is not available on access modules or contract.');
  }
  return method(...context.methodArgs);
});
export default handler;

