const count = (value) => {
    if (Array.isArray(value))
        return value.length;
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};
export function withRoleFlags(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record))
        return record;
    const r = record;
    if ('isSponsor' in r || 'isRecipient' in r || 'isAgent' in r)
        return record;
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
    };
}
