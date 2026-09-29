// @ts-nocheck
export async function getAgentSponsorKeys(context, agentKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader("getAgentSponsorKeys(" + agentKey + ")");
  try {
    const keys = await runtime.spCoinContractDeployed.getAgentSponsorKeys(agentKey);
    runtime.spCoinLogger.logExitFunction();
    return Array.isArray(keys) ? keys.map((key) => String(key)) : [];
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
    throw error;
  }
}
