// @ts-nocheck
import { createDynamicHandler, getDynamicMethod } from '../../readMethodRuntime';
const handler = createDynamicHandler('getSpCoinMetaData', async (result, context) => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return result;
    }
    const metadata = result as Record<string, unknown>;
    let creationDate = '';
    try {
        const creationTimeMethod = getDynamicMethod(context.contract, 'creationTime');
        if (creationTimeMethod) {
            creationDate = context.formatCreationTimeResult(await creationTimeMethod()).formatted;
        }
    }
    catch {
        creationDate = '';
    }
    const resolvedCreationDate = creationDate || String(metadata.creationDate ?? '');
    return {
        agentRateRange: metadata.agentRateRange,
        contractAddress: context.target,
        creationDate: resolvedCreationDate,
        decimals: metadata.decimals,
        inflationRate: metadata.inflationRate,
        name: String(metadata.name ?? ''),
        owner: String(metadata.owner ?? ''),
        recipientRateRange: metadata.recipientRateRange,
        symbol: String(metadata.symbol ?? ''),
        totalSupply: metadata.totalSupply,
        version: String(metadata.version ?? ''),
    };
});
export default handler;

