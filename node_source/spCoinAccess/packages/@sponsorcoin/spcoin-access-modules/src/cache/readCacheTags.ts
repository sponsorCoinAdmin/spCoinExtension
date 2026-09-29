import { getChainId, getContractAddress, normalizeAddress } from "./readCacheKeys";

const METHOD_DOMAIN_TAGS: Record<string, string[]> = {
  getInflationRate: ["inflation", "rewards"],
  getAccountRecord: ["account-record", "rewards"],
  getAccountRelationshipRecord: ["account-record", "account-links", "rewards"],
  getAccountRewardSnapshotRecord: ["account-record", "rewards"],
  getAccountRewardTotals: ["account-record", "rewards"],
  getSummaryRecord: ["account-record", "rewards"],
  getAccountLinks: ["account-links"],
  getSponsorRecipientRates: ["rates"],
  getRecipientRateTransactionSetKey: ["rates", "rate-transactions"],
  getAgentRateTransactionSetKey: ["rates", "rate-transactions"],
  getRateTransactionSet: ["rate-transactions", "rewards"],
  getRecipientRateAgentList: ["account-links", "rates"],
  getAgentRateList: ["rates"],
  estimateOffChainTotalRewards: ["rewards"],
  estimateOffChainSponsorRewards: ["rewards"],
  estimateOffChainRecipientRewards: ["rewards"],
  estimateOffChainAgentRewards: ["rewards"],
};

export function buildReadCacheDependencies(context: unknown, method: string, args: unknown[]): Set<string> {
  const contractAddress = getContractAddress(context);
  const chainId = getChainId(context);
  const dependencies = new Set<string>([
    `chain:${chainId}`,
    `contract:${chainId}:${contractAddress}`,
    `method:${String(method || "")}`,
  ]);

  for (const tag of METHOD_DOMAIN_TAGS[String(method || "")] ?? []) {
    dependencies.add(tag);
  }

  for (const arg of args) {
    if (typeof arg === "string" && /^0x[a-fA-F0-9]{40}$/.test(arg.trim())) {
      dependencies.add(`account:${normalizeAddress(arg)}`);
    }
  }

  return dependencies;
}
