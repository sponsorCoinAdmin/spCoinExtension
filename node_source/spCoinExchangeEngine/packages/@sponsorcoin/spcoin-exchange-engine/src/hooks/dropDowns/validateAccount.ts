// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/validateAccount.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/hooks/ExchangeContext/nested/accounts/validateAccount.ts.
// Already fully portable (no React, no context) — grouped under
// hooks/dropDowns/ rather than hooks/accounts/ since this is genuinely
// dropdown-selection-specific (the Sponsor/Recipient/Agent mutual-
// exclusion rule a picker enforces at selection time), not a general
// account-state accessor the way the accounts/ family is.

import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';

/**
 * A transaction consists of a Sponsor, a Recipient, and an optional Agent.
 * These three roles must be mutually exclusive — no address may be picked
 * for more than one role at once (Rule 1: Sponsor ≠ Recipient. Rule 2:
 * Agent ≠ Sponsor and Agent ≠ Recipient).
 */
export type AccountRoleType = 'SPONSOR' | 'RECIPIENT' | 'AGENT';

const ROLE_LABEL: Record<AccountRoleType, string> = {
  SPONSOR: 'Sponsor',
  RECIPIENT: 'Recipient',
  AGENT: 'Agent',
};

export interface RoleAccounts {
  sponsorAccount?: spCoinAccount;
  recipientAccount?: spCoinAccount;
  agentAccount?: spCoinAccount;
}

export interface ValidateAccountResult {
  ok: boolean;
  /** "ERROR: $TYPE cannot be the same as $COMPARE_TYPE.\n$TYPE address: $address" — only set when !ok. */
  message?: string;
}

function normalize(address: string | undefined): string {
  return String(address ?? '').trim().toLowerCase();
}

/**
 * Checks a candidate address being picked for `type` against the other two
 * roles' currently-selected addresses. Returns the first collision found —
 * case SPONSOR checks against Recipient then Agent; case RECIPIENT checks
 * against Sponsor then Agent; case AGENT checks against Sponsor then
 * Recipient.
 */
export function validateAccount(
  type: AccountRoleType,
  address: string,
  accounts: RoleAccounts,
): ValidateAccountResult {
  const candidate = normalize(address);
  if (!candidate) return { ok: true };

  const peers: { type: AccountRoleType; address?: string }[] =
    type === 'SPONSOR'
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
