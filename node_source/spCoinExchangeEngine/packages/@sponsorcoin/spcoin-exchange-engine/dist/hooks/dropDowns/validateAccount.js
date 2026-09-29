// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/validateAccount.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/hooks/ExchangeContext/nested/accounts/validateAccount.ts.
// Already fully portable (no React, no context) — grouped under
// hooks/dropDowns/ rather than hooks/accounts/ since this is genuinely
// dropdown-selection-specific (the Sponsor/Recipient/Agent mutual-
// exclusion rule a picker enforces at selection time), not a general
// account-state accessor the way the accounts/ family is.
const ROLE_LABEL = {
    SPONSOR: 'Sponsor',
    RECIPIENT: 'Recipient',
    AGENT: 'Agent',
};
function normalize(address) {
    return String(address ?? '').trim().toLowerCase();
}
/**
 * Checks a candidate address being picked for `type` against the other two
 * roles' currently-selected addresses. Returns the first collision found —
 * case SPONSOR checks against Recipient then Agent; case RECIPIENT checks
 * against Sponsor then Agent; case AGENT checks against Sponsor then
 * Recipient.
 */
export function validateAccount(type, address, accounts) {
    const candidate = normalize(address);
    if (!candidate)
        return { ok: true };
    const peers = type === 'SPONSOR'
        ? [
            { type: 'RECIPIENT', address: accounts.recipientAccount?.address },
            { type: 'AGENT', address: accounts.agentAccount?.address },
        ]
        : type === 'RECIPIENT'
            ? [
                { type: 'SPONSOR', address: accounts.sponsorAccount?.address },
                { type: 'AGENT', address: accounts.agentAccount?.address },
            ]
            : [
                { type: 'SPONSOR', address: accounts.sponsorAccount?.address },
                { type: 'RECIPIENT', address: accounts.recipientAccount?.address },
            ];
    for (const peer of peers) {
        if (peer.address && normalize(peer.address) === candidate) {
            return {
                ok: false,
                message: `ERROR: ${ROLE_LABEL[type]} cannot be the same as ${ROLE_LABEL[peer.type]}.\n${ROLE_LABEL[type]} address: ${address}`,
            };
        }
    }
    return { ok: true };
}
