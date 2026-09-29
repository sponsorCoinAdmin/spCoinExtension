import { normalizeAddress } from "./readCacheKeys";
import { invalidateReadCacheByDependencies, invalidateReadCacheForAccount } from "./readCacheStore";

const WRITE_DOMAIN_TAGS: Record<string, string[]> = {
  claimOnChainTotalRewards: ["rewards"],
  claimOnChainSponsorRewards: ["rewards"],
  claimOnChainRecipientRewards: ["rewards"],
  claimOnChainAgentRewards: ["rewards"],
  sponsorRecipientTransaction: ["rewards", "account-links", "rates", "rate-transactions"],
  sponsorAgentTransaction: ["rewards", "account-links", "rates", "rate-transactions"],
  addRecipient: ["rewards", "account-links", "rates"],
  addAgent: ["rewards", "account-links", "rates"],
  unSponsorRecipient: ["rewards", "account-links", "rates", "rate-transactions"],
  unSponsorAgent: ["rewards", "account-links", "rates", "rate-transactions"],
  deleteRecipientRate: ["rewards", "rates", "rate-transactions"],
  deleteAgentRate: ["rewards", "rates", "rate-transactions"],
  setInflationRate: ["inflation", "rewards"],
  addRecipientRate: ["rates", "rewards"],
  addAgentRate: ["rates", "rewards"],
};

export function invalidateAfterWrite(methodName: string, args: unknown[] = []): number {
  const dependencies = new Set<string>(WRITE_DOMAIN_TAGS[String(methodName || "")] ?? []);
  for (const arg of args) {
    if (typeof arg === "string" && /^0x[a-fA-F0-9]{40}$/.test(arg.trim())) {
      dependencies.add(`account:${normalizeAddress(arg)}`);
    }
  }
  if (dependencies.size === 0) return 0;
  return invalidateReadCacheByDependencies(dependencies);
}

export function invalidateAfterAccountWrite(accountKey: string): number {
  return invalidateReadCacheForAccount(accountKey);
}

