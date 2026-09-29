import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
/**
 * A transaction consists of a Sponsor, a Recipient, and an optional Agent.
 * These three roles must be mutually exclusive — no address may be picked
 * for more than one role at once (Rule 1: Sponsor ≠ Recipient. Rule 2:
 * Agent ≠ Sponsor and Agent ≠ Recipient).
 */
export type AccountRoleType = 'SPONSOR' | 'RECIPIENT' | 'AGENT';
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
/**
 * Checks a candidate address being picked for `type` against the other two
 * roles' currently-selected addresses. Returns the first collision found —
 * case SPONSOR checks against Recipient then Agent; case RECIPIENT checks
 * against Sponsor then Agent; case AGENT checks against Sponsor then
 * Recipient.
 */
export declare function validateAccount(type: AccountRoleType, address: string, accounts: RoleAccounts): ValidateAccountResult;
