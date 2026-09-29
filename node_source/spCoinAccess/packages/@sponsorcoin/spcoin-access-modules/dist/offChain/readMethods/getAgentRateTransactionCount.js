// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const WILDCARD = '*';
function isWildcard(value) {
    const str = String(value ?? '').trim();
    return str === WILDCARD || str === '';
}
function resolveList(value, fallback) {
    return Array.isArray(value) ? value : fallback;
}
const handler = buildHandler('getAgentRateTransactionCount', async (context) => {
    const [sponsorArg, recipientArg, recipientRateArg, agentArg, agentRateArg] = context.methodArgs;
    const sponsorWild = isWildcard(sponsorArg);
    const recipientWild = isWildcard(recipientArg);
    const recipientRateWild = isWildcard(recipientRateArg);
    const agentWild = isWildcard(agentArg);
    const agentRateWild = isWildcard(agentRateArg);
    // Resolve sponsor list
    const sponsorKeys = sponsorWild
        ? resolveList(await context.read.getMasterAccountKeys?.(), []).map((k) => String(k))
        : [String(sponsorArg)];
    let totalCount = 0;
    for (const sponsorKey of sponsorKeys) {
        // Resolve recipient list
        const recipientKeys = recipientWild
            ? resolveList(await context.read.getRecipientKeys?.(sponsorKey), []).map((k) => String(k))
            : [String(recipientArg)];
        for (const recipientKey of recipientKeys) {
            // Resolve recipient rate list
            const recipientRateKeys = recipientRateWild
                ? resolveList(await context.read.getRecipientRateKeys?.(sponsorKey, recipientKey), []).map((k) => String(k))
                : [String(recipientRateArg)];
            for (const recipientRateKey of recipientRateKeys) {
                // Resolve agent list
                const agentKeys = agentWild
                    ? resolveList(await context.read.getRecipientRateAgentKeys?.(sponsorKey, recipientKey, recipientRateKey), []).map((k) => String(k))
                    : [String(agentArg)];
                for (const agentKey of agentKeys) {
                    // Resolve agent rate list
                    const agentRateKeys = agentRateWild
                        ? resolveList(await context.read.getAgentRateKeys?.(sponsorKey, recipientKey, recipientRateKey, agentKey), []).map((k) => String(k))
                        : [String(agentRateArg)];
                    for (const agentRateKey of agentRateKeys) {
                        try {
                            const count = await context.read.getAgentTransactionCount?.(sponsorKey, recipientKey, recipientRateKey, agentKey, agentRateKey);
                            totalCount += Number(count ?? 0);
                        }
                        catch {
                            // skip missing branches
                        }
                    }
                }
            }
        }
    }
    return totalCount;
});
export default handler;
