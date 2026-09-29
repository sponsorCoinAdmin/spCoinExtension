// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getAgentRecordList', async (context) => {
    const sponsorKey = String(context.methodArgs[0]);
    const recipientKey = String(context.methodArgs[1]);
    const recipientRateKey = String(context.methodArgs[2]);
    const agentAccountList = context.methodArgs[3];
    return Promise.all(agentAccountList.map(async (agentKey) => ({
        agentKey,
        stakedSPCoins: await context.contract.getAgentTotalRecipient?.(sponsorKey, recipientKey, recipientRateKey, agentKey),
        agentRateList: await context.contract.getAgentRateList?.(sponsorKey, recipientKey, recipientRateKey, agentKey),
    })));
});
export default handler;

