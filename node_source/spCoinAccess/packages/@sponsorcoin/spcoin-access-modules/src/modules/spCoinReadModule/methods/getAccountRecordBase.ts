// @ts-nocheck
export async function getAccountRecordBase(context, accountKey) {
  const runtime = context;
  runtime.spCoinLogger.logFunctionHeader("getAccountRecordBase(" + accountKey + ")");
  try {
    const record = await runtime.spCoinContractDeployed.getAccountRecord(accountKey);
    const links =
      typeof runtime.getAccountLinks === "function"
        ? await runtime.getAccountLinks(accountKey)
        : typeof runtime.spCoinContractDeployed.getAccountLinks === "function"
        ? await runtime.spCoinContractDeployed.getAccountLinks(accountKey)
        : [];
    const sponsorKeysRaw = links?.sponsorKeys ?? links?.[0] ?? [];
    const recipientKeysRaw = links?.recipientKeys ?? links?.[1] ?? [];
    const parentRecipientKeysRaw = links?.parentRecipientKeys ?? links?.[3] ?? [];
    const [
      accountKeyVal,
      , // creationTime
      , // balanceOf
      , // stakedBalance
      , // stakingRewards
      , // sponsorCount
      , // recipientCount
      , // agentCount
      , // parentRecipientCount
      lastSponsorUpdateTimeStamp,
      lastRecipientUpdateTimeStamp,
      lastAgentUpdateTimeStamp,
    ] = record;
    const toStrArray = (arr: unknown[]): string[] => Array.from(new Set(arr.map(String).filter(Boolean)));
    runtime.spCoinLogger.logExitFunction();
    return {
      accountKey: String(accountKeyVal ?? accountKey ?? ""),
      lastSponsorUpdateTimeStamp: String(lastSponsorUpdateTimeStamp ?? "0"),
      lastRecipientUpdateTimeStamp: String(lastRecipientUpdateTimeStamp ?? "0"),
      lastAgentUpdateTimeStamp: String(lastAgentUpdateTimeStamp ?? "0"),
      sponsorKeys: toStrArray(Array.isArray(sponsorKeysRaw) ? sponsorKeysRaw : []),
      recipientKeys: toStrArray(Array.isArray(recipientKeysRaw) ? recipientKeysRaw : []),
      parentRecipientKeys: toStrArray(Array.isArray(parentRecipientKeysRaw) ? parentRecipientKeysRaw : []),
    };
  } catch (error) {
    runtime.spCoinLogger.logExitFunction();
   throw error;
  }
}
