// @ts-nocheck
export async function getAgentRateTransactionSetKey(context, sponsorKey, recipientKey, recipientRateKey, agentKey, agentRateKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader("getAgentRateTransactionSetKey(...)");
  try {
    const key = await runtime.spCoinContractDeployed.getAgentRateTransactionSetKey(sponsorKey, recipientKey, recipientRateKey, agentKey, agentRateKey);
    runtime.spCoinLogger.logExitFunction();
    return key;
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
    throw error;
  }
}
