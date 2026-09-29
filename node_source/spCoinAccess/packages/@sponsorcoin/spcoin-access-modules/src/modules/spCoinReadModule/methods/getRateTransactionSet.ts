// @ts-nocheck
export async function getRateTransactionSet(context, setKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader("getRateTransactionSet(" + setKey + ")");
  try {
    const raw = await runtime.spCoinContractDeployed.getRateTransactionSet(setKey);
    // raw tuple: [setKey, rate, creationTimeStamp, lastUpdateTimeStamp, totalStaked, transactionCount, inserted]
    const [
      setKeyVal,
      rate,
      creationTimeStamp,
      lastUpdateTimeStamp,
      totalStaked,
      transactionCount,
      inserted,
    ] = raw;
    runtime.spCoinLogger.logExitFunction();
    return {
      setKey: setKeyVal,
      rate: String(rate),
      creationTimeStamp: String(creationTimeStamp),
      lastUpdateTimeStamp: String(lastUpdateTimeStamp),
      totalStaked: String(totalStaked),
      transactionCount: String(transactionCount),
      inserted: Boolean(inserted),
    };
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
    throw error;
  }
}
