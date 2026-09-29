// @ts-nocheck
export async function getAgentSponsorAgentRateTransactionSetKeys(context, agentKey, sponsorKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader(
    "getAgentSponsorAgentRateTransactionSetKeys(" + agentKey + ", " + sponsorKey + ")",
  );
  try {
    const setKeys = await runtime.spCoinContractDeployed.getAgentSponsorAgentRateTransactionSetKeys(
      agentKey,
      sponsorKey,
    );
    runtime.spCoinLogger.logExitFunction();
    return Array.isArray(setKeys) ? setKeys.map((setKey) => String(setKey)) : [];
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
    throw error;
  }
}
