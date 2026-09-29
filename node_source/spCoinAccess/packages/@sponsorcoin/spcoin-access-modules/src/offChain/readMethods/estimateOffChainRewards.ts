// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

async function estimate(context, role) {
    const accountKey = String(context.methodArgs[0]);
    const methodName = `estimateOffChain${role}Rewards`;
    const directMethod = context.read[methodName];
    if (typeof directMethod === 'function') {
        return directMethod(accountKey, context.readCacheOptions);
    }
    throw new Error(`${methodName} is not available on the current SpCoin read access path.`);
}

export const estimateOffChainTotalRewards = buildHandler('estimateOffChainTotalRewards', async (context) => estimate(context, 'Total'));
export const estimateOffChainSponsorRewards = buildHandler('estimateOffChainSponsorRewards', async (context) => estimate(context, 'Sponsor'));
export const estimateOffChainRecipientRewards = buildHandler('estimateOffChainRecipientRewards', async (context) => estimate(context, 'Recipient'));
export const estimateOffChainAgentRewards = buildHandler('estimateOffChainAgentRewards', async (context) => estimate(context, 'Agent'));
