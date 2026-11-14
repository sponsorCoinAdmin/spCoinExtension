// File: src/rewards/accountRoleFlags.ts
//
// 2026-11-14 (owner: the extension and the web app must run the same code): the ONE rule that turns the contract's account record into the role flags (isSponsor / isRecipient / isAgent) the Rewards panel reads. It is the rule the
// access module's getAccountRecord applies on the web server (a Sponsor has recipients; a Recipient has sponsors, agents or rate sets; an Agent has parent recipients or agent rate sets). A host passes the record as the contract
// returns it; a record that already carries the flags (the web server's) is returned unchanged.
type Rec = Record<string, unknown>;

const count = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function withRoleFlags<T>(record: T): T {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  const r = record as Rec;
  if ('isSponsor' in r || 'isRecipient' in r || 'isAgent' in r) return record;
  const sponsors = count(r.sponsorKeys ?? r.sponsorCount);
  const recipients = count(r.recipientKeys ?? r.recipientCount);
  const agents = count(r.agentKeys ?? r.agentCount);
  const parentRecipients = count(r.parentRecipientKeys ?? r.parentRecipientCount);
  const recipientRateSets = count(r.recipientRateTransactionSetKeys ?? r.recipientRateTransactionSetCount);
  const agentRateSets = count(r.agentRateTransactionSetKeys ?? r.agentRateTransactionSetCount);
  return {
    ...r,
    isSponsor: recipients > 0,
    isRecipient: sponsors > 0 || agents > 0 || recipientRateSets > 0,
    isAgent: parentRecipients > 0 || agentRateSets > 0,
  } as T;
}
