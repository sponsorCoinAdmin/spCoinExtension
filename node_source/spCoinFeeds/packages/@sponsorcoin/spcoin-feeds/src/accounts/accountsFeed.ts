import { fetchJson, fetchJsonOrNull } from '../shared/fetchJson';
import { MemoCache, withMemoCache } from '../shared/memoCache';
import type {
  AccountsFeedConfig,
  KeystoreAccountEntry,
  AccountMetadata,
  AddKeystoreAccountInput,
  AccountListGroupData,
  AccountListRowData,
  AccountRole,
} from './types';

const KEYSTORE_CACHE_TTL_MS = 30_000;
const METADATA_CACHE_TTL_MS = 5 * 60_000;
const ROLE_LIST_CACHE_TTL_MS = 60_000;

const keystoreCache = new MemoCache<KeystoreAccountEntry[]>(KEYSTORE_CACHE_TTL_MS);
const metadataCache = new MemoCache<AccountMetadata | null>(METADATA_CACHE_TTL_MS);
const roleListCache = new MemoCache<string[]>(ROLE_LIST_CACHE_TTL_MS);

const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;
const HARDHAT_DISK_ASSET_CHAIN_ID = 8453;

/**
 * Same duplicated-not-cross-imported pattern as tokens/tokensFeed.ts's own
 * resolveDiskAssetChainId (see that file's doc comment for the full
 * reasoning) — Hardhat (31337) has no recipients/agents/sponsors.accounts.json
 * of its own on disk; the real app's own getAccountFeedPublicUrl resolves
 * every role-directory URL through Base's (8453) folder for exactly this
 * chain, confirmed by direct read of that function.
 */
function resolveDiskAssetChainId(chainId: number): number {
  return chainId === MERIT_WALLET_HARDHAT_CHAIN_ID ? HARDHAT_DISK_ASSET_CHAIN_ID : chainId;
}

/** GET testAccounts entries can be a bare address string or an object —
 *  matches the real route's own TestAccountEntry union (route.ts), minus
 *  the private-key fields the server already strips before responding. */
type RawKeystoreEntry = string | { address?: unknown; label?: unknown };

function normalizeKeystoreEntry(entry: RawKeystoreEntry): KeystoreAccountEntry | null {
  if (typeof entry === 'string') {
    return entry ? { address: entry } : null;
  }
  const address = typeof entry.address === 'string' ? entry.address : null;
  if (!address) return null;
  const label = typeof entry.label === 'string' ? entry.label : undefined;
  return { address, label };
}

/** GET /api/spCoin/lab/networks/{chainId}/testAccounts */
export async function fetchKeystoreAccounts(
  chainId: number,
  config?: AccountsFeedConfig,
): Promise<KeystoreAccountEntry[]> {
  return withMemoCache(keystoreCache, `${config?.baseUrl ?? ''}:${chainId}`, async () => {
    const raw = await fetchJson<RawKeystoreEntry[]>(
      `/api/spCoin/lab/networks/${chainId}/testAccounts`,
      config,
    );
    return raw.map(normalizeKeystoreEntry).filter((entry): entry is KeystoreAccountEntry => entry !== null);
  });
}

/**
 * Computed the same way fetchAccountListGroups' own rows already resolved
 * this inline (public/assets/accounts/{ADDRESS}/avatar.png, uppercased) —
 * 2026-09-16, pulled out into its own export so a caller resolving ONE
 * account on demand (e.g. an avatar-icon click opening a details view)
 * doesn't have to duplicate the path convention by hand.
 */
export function getAccountAvatarURL(address: string): string {
  return `/assets/accounts/${address.toUpperCase()}/avatar.png`;
}

/** GET /assets/accounts/{address}/account.json — resolves to null on a 404,
 *  matching that this is directory/display data that may not exist yet for
 *  a freshly-added account. */
export async function fetchAccountMetadata(
  address: string,
  config?: AccountsFeedConfig,
): Promise<AccountMetadata | null> {
  return withMemoCache(metadataCache, `${config?.baseUrl ?? ''}:${address.toLowerCase()}`, () =>
    fetchJsonOrNull<AccountMetadata>(`/assets/accounts/${address}/account.json`, config),
  );
}

/**
 * POST /api/spCoin/lab/networks/{chainId}/testAccounts — real write, built
 * per the plan's "implement read/write, exercise read first" instruction.
 * Real server precondition (not re-validated here): the address must
 * already exist locally (hasLocalMeritWalletAccount) — this registers an
 * existing account into the keystore, it does not create one from nothing.
 */
export async function addKeystoreAccount(
  chainId: number,
  entry: AddKeystoreAccountInput,
  config?: AccountsFeedConfig,
): Promise<void> {
  await fetchJson(
    `/api/spCoin/lab/networks/${chainId}/testAccounts`,
    config,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    },
  );
  keystoreCache.delete(`${config?.baseUrl ?? ''}:${chainId}`);
}

/** DELETE /api/spCoin/lab/networks/{chainId}/testAccounts */
export async function removeKeystoreAccount(
  chainId: number,
  address: string,
  config?: AccountsFeedConfig,
): Promise<void> {
  await fetchJson(
    `/api/spCoin/lab/networks/${chainId}/testAccounts`,
    config,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    },
  );
  keystoreCache.delete(`${config?.baseUrl ?? ''}:${chainId}`);
}

/**
 * Composed: keystore entries + per-address metadata, shaped into exactly
 * one AccountListCard group ("Merit Wallet" — the hardhat/local source).
 * Deliberately returns AccountListGroupData (plain data, no onSelect/
 * onInfoClick/icon/badge) — attaching UI callbacks is the caller's job,
 * same boundary spcoin-panels' own AccountListEntry type draws.
 */
export async function fetchAccountListGroups(
  chainId: number,
  config?: AccountsFeedConfig,
): Promise<AccountListGroupData[]> {
  const entries = await fetchKeystoreAccounts(chainId, config);
  const metadataResults = await Promise.all(
    entries.map((entry) => fetchAccountMetadata(entry.address, config)),
  );

  const rows = entries.map((entry, i) => {
    const metadata = metadataResults[i];
    return {
      id: entry.address,
      symbol: metadata?.symbol,
      name: metadata?.name ?? entry.label,
      address: entry.address,
      // Same computed-path convention as NetworkRecord.logoURL — confirmed
      // live against the real public/assets/accounts/{ADDRESS}/avatar.png
      // files (uppercase address, matching account.json's own sibling
      // file next to it) rather than a field stored in account.json itself.
      avatarURL: getAccountAvatarURL(entry.address),
    };
  });

  return [
    {
      id: 'merit-wallet',
      label: 'Merit Wallet',
      isActiveSource: true,
      accounts: rows,
    },
  ];
}

/** GET /assets/blockchains/{diskChainId}/{role}.accounts.json — a plain
 *  array of addresses (confirmed by direct read of the real files), not a
 *  keystore. 404/empty resolves to []. */
async function fetchAccountRoleAddresses(
  role: AccountRole,
  chainId: number,
  config?: AccountsFeedConfig,
): Promise<string[]> {
  const diskChainId = resolveDiskAssetChainId(chainId);
  const url = `/assets/blockchains/${diskChainId}/${role}.accounts.json`;
  return withMemoCache(roleListCache, `${config?.baseUrl ?? ''}:${url}`, async () => {
    const raw = await fetchJsonOrNull<unknown>(url, config);
    return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === 'string') : [];
  });
}

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
export async function fetchAccountRoleList(
  role: AccountRole,
  chainId: number,
  config?: AccountsFeedConfig,
): Promise<AccountListRowData[]> {
  const addresses = await fetchAccountRoleAddresses(role, chainId, config);
  const metadataResults = await Promise.all(
    addresses.map((address) => fetchAccountMetadata(address, config)),
  );

  return addresses.map((address, i) => {
    const metadata = metadataResults[i];
    return {
      id: address,
      symbol: metadata?.symbol,
      name: metadata?.name,
      address,
      avatarURL: getAccountAvatarURL(address),
    };
  });
}
