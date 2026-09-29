// @ts-nocheck
export async function getRecipientRateTransactionSetKey(context, sponsorKey, recipientKey, recipientRateKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader("getRecipientRateTransactionSetKey(...)");
  try {
    const key = await runtime.spCoinContractDeployed.getRecipientRateTransactionSetKey(sponsorKey, recipientKey, recipientRateKey);
    runtime.spCoinLogger.logExitFunction();
    return key;
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
    throw error;
  }
}
