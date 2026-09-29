// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getAgent', async (context) => {
    const stakedSPCoins = await context.contract.getAgentTotalRecipient?.(context.methodArgs[0], context.methodArgs[1], context.methodArgs[2], context.methodArgs[3]);
    const agentRateList = await context.contract.getAgentRateList?.(context.methodArgs[0], context.methodArgs[1], context.methodArgs[2], context.methodArgs[3]);
    return { agentKey: context.methodArgs[3], stakedSPCoins, agentRateList };
});
export default handler;

