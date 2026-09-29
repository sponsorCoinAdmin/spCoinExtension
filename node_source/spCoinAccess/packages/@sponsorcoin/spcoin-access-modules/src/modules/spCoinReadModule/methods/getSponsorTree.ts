// @ts-nocheck
export async function getSponsorTree(context, _sponsorKey) {
    context.spCoinLogger.logFunctionHeader("getSponsorTree(" + _sponsorKey + ")");
    const tree = await context.spCoinContractDeployed.getSponsorTree(_sponsorKey);
    context.spCoinLogger.logExitFunction();
    return tree;
}
