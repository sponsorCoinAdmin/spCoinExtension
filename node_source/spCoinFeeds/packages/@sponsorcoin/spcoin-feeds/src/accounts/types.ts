import type { FetchJsonConfig } from '../shared/fetchJson';

export type AccountsFeedConfig = FetchJsonConfig;

/**
 * The client-safe shape returned by
 * GET /api/spCoin/lab/networks/{chainId}/testAccounts — mirrors
 * toClientSafeKeyStoreEntries's output (keystore.server.ts): every field
 * except the private key survives.
 */
export interface KeystoreAccountEntry {
  address: string;
  label?: string;
}

/**
 * The shape of public/assets/accounts/{address}/account.json — directory/
 * display data, not a secret (per accountAuthDesign.md's own audit).
 */
export interface AccountMetadata {
  address: string;
  name?: string;
  symbol?: string;
  email?: string;
  website?: string;
  description?: string;
  recipientNetwork?: number[];
}

/**
 * One entry to add to the Merit Wallet keystore via POST testAccounts.
 * Real precondition, not enforced client-side: the server only accepts an
 * address that already exists locally (hasLocalMeritWalletAccount) — this
 * registers an existing local account into the keystore, it does not create
 * one from nothing. privateKey and encryptedKey are mutually exclusive;
 * privateKey wins if both are somehow sent (matches the route's own
 * precedence).
 */
export interface AddKeystoreAccountInput {
  address: string;
  privateKey?: string;
  encryptedKey?: string;
}

/** Plain data shape for one row in an AccountListCard group — deliberately
 *  omits onSelect/onInfoClick/icon/badge (spcoin-panels' AssetListRowProps
 *  fields): those are UI-layer concerns, not this feed's job to produce.
 *  `avatarURL` is the one exception, same reasoning as NetworkRecord's own
 *  `logoURL` (networks/types.ts): a real, always-computable path (the
 *  public/assets/accounts/{ADDRESS}/avatar.png convention — confirmed
 *  live for every real test account), not a UI callback, so resolving it
 *  here is this feed's job; turning it into an actual <img> (fetching,
 *  caching, building the element) stays the caller's. */
export interface AccountListRowData {
  id: string;
  symbol?: string;
  name?: string;
  address?: string;
  isActive?: boolean;
  avatarURL: string;
}

/** Plain data shape for one AccountListCard group. */
export interface AccountListGroupData {
  id: string;
  label: string;
  isActiveSource: boolean;
  accounts: AccountListRowData[];
}

/**
 * 2026-09-16, on live report ("I think the selection lists are different
 * in the web site vs the extension") — confirmed: the real app's Send/
 * Sponsor recipient pickers read a chain-scoped ROLE directory (real
 * sponsor-selected recipient causes, e.g. "FREE | Born Free USA"), not the
 * Merit Wallet keystore fetchAccountListGroups already covers — the
 * extension's own recipient list was falling back to the wallet's own
 * accounts (HH_BASE_1..19) purely because no portable fetch for this role
 * directory existed yet. Matches the real app's own
 * FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS/REMOTE_AGENT_ACCOUNTS/
 * REMOTE_SPONSOR_ACCOUNTS three-way split (getAccountFeedPublicUrl).
 */
export type AccountRole = 'recipients' | 'agents' | 'sponsors';
