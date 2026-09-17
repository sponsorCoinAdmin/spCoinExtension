import type { AccountsFeedConfig, KeystoreAccountEntry, AccountMetadata, AddKeystoreAccountInput, AccountListGroupData, AccountListRowData, AccountRole } from './types';
/** GET /api/spCoin/lab/networks/{chainId}/testAccounts */
export declare function fetchKeystoreAccounts(chainId: number, config?: AccountsFeedConfig): Promise<KeystoreAccountEntry[]>;
/**
 * Computed the same way fetchAccountListGroups' own rows already resolved
 * this inline (public/assets/accounts/{ADDRESS}/avatar.png, uppercased) —
 * 2026-09-16, pulled out into its own export so a caller resolving ONE
 * account on demand (e.g. an avatar-icon click opening a details view)
 * doesn't have to duplicate the path convention by hand.
 */
export declare function getAccountAvatarURL(address: string): string;
/** GET /assets/accounts/{address}/account.json — resolves to null on a 404,
 *  matching that this is directory/display data that may not exist yet for
 *  a freshly-added account. */
export declare function fetchAccountMetadata(address: string, config?: AccountsFeedConfig): Promise<AccountMetadata | null>;
/**
 * POST /api/spCoin/lab/networks/{chainId}/testAccounts — real write, built
 * per the plan's "implement read/write, exercise read first" instruction.
 * Real server precondition (not re-validated here): the address must
 * already exist locally (hasLocalMeritWalletAccount) — this registers an
 * existing account into the keystore, it does not create one from nothing.
 */
export declare function addKeystoreAccount(chainId: number, entry: AddKeystoreAccountInput, config?: AccountsFeedConfig): Promise<void>;
/** DELETE /api/spCoin/lab/networks/{chainId}/testAccounts */
export declare function removeKeystoreAccount(chainId: number, address: string, config?: AccountsFeedConfig): Promise<void>;
/**
 * Composed: keystore entries + per-address metadata, shaped into exactly
 * one AccountListCard group ("Merit Wallet" — the hardhat/local source).
 * Deliberately returns AccountListGroupData (plain data, no onSelect/
 * onInfoClick/icon/badge) — attaching UI callbacks is the caller's job,
 * same boundary spcoin-panels' own AccountListEntry type draws.
 */
export declare function fetchAccountListGroups(chainId: number, config?: AccountsFeedConfig): Promise<AccountListGroupData[]>;
/**
 * 2026-09-16, on live report ("I think the selection lists are different
 * in the web site vs the extension") — the recipients/agents/sponsors
 * counterpart to fetchAccountListGroups above: same composition (role
 * directory + per-address metadata + avatar), but a real, DIFFERENT
 * address list from the wallet's own keystore — matches the real app's
 * FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS/REMOTE_AGENT_ACCOUNTS/
 * REMOTE_SPONSOR_ACCOUNTS. Returns a flat row list (not grouped) — unlike
 * the wallet's own accounts, these were never presented as "Merit
 * Wallet"/"MetaMask" sourced groups in the real app either.
 */
export declare function fetchAccountRoleList(role: AccountRole, chainId: number, config?: AccountsFeedConfig): Promise<AccountListRowData[]>;
