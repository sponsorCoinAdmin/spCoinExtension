// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/activeAccountCore.ts
//
// docs/meritMigration.txt row 24 (walletState.tsx): the pure decisions inside selectAccount and selectNetwork, written once for every host. The web provider (and, later, any other host) calls them;
// React state, the exchange context setter and the sync push stay with the host. Behaviour is the original inline code's (scripts/test/buildNextActiveAccount.characterize.cjs and selectNetworkPure.characterize.cjs pin it).

/** What the wallet knows about an account the user clicked. */
export interface SelectedAccountInput {
  address: string;
  name?: string;
  label?: string;
  symbol?: string;
  website?: string;
  description?: string;
  email?: string;
  logoURL?: string;
}

/** The fields of the account that is active now that a switch may reuse. */
export interface CurrentActiveAccount {
  address?: string;
  name?: string;
  symbol?: string;
  type?: string;
  website?: string;
  description?: string;
  status?: unknown;
  email?: string;
  logoURL?: string;
  balance?: bigint;
}

/** What a host supplies that this module does not own: the address normaliser and the "info" status value. */
export interface ActiveAccountDeps {
  normalizeAddress(address: string): string;
  infoStatus: unknown;
}

/**
 * The account to make active. The current active account's fields are reused ONLY when it is the same address being re-selected: falling back across a real
 * address switch would smear the previous account's name, logo and email onto the new address before its own metadata has loaded.
 */
export function buildNextActiveAccount<TStatus = unknown>(
  account: SelectedAccountInput,
  currentActiveAccount: CurrentActiveAccount | null | undefined,
  deps: ActiveAccountDeps,
) {
  const isSameAddressAsCurrent =
    !!currentActiveAccount?.address &&
    deps.normalizeAddress(String(currentActiveAccount.address)) === deps.normalizeAddress(account.address);
  const fallbackAccount = isSameAddressAsCurrent ? currentActiveAccount : undefined;
  return {
    name: String(account.name || account.label || fallbackAccount?.name || 'Unnamed account').trim(),
    symbol: String(account.symbol || fallbackAccount?.symbol || '').trim(),
    type: fallbackAccount?.type ?? 'account',
    website: String(account.website || fallbackAccount?.website || '').trim(),
    description: String(account.description || fallbackAccount?.description || '').trim(),
    status: (fallbackAccount?.status ?? deps.infoStatus) as TStatus,
    address: deps.normalizeAddress(String(account.address)),
    ...(account.email
      ? { email: String(account.email).trim() }
      : fallbackAccount?.email
        ? { email: String(fallbackAccount.email).trim() }
        : {}),
    ...(account.logoURL
      ? { logoURL: account.logoURL }
      : fallbackAccount?.logoURL
        ? { logoURL: fallbackAccount.logoURL }
        : {}),
    balance: fallbackAccount?.balance ?? 0n,
  };
}

interface NetworkSection {
  appChainId?: unknown;
  rpcUrl?: unknown;
}
interface ContextWithNetwork {
  apiCoreSyncedMembers: { network: NetworkSection };
}

/** The state update for a network switch: the same object back when the chain is already selected (no re-render), else the network section derived from the new chain id. */
export function applyNetworkSelection<T extends ContextWithNetwork>(
  prev: T,
  chainId: number,
  deriveNetworkFromApp: (chainId: number, network: T['apiCoreSyncedMembers']['network']) => T['apiCoreSyncedMembers']['network'],
): T {
  if (prev.apiCoreSyncedMembers.network.appChainId === chainId) return prev;
  return {
    ...prev,
    apiCoreSyncedMembers: {
      ...prev.apiCoreSyncedMembers,
      network: deriveNetworkFromApp(chainId, prev.apiCoreSyncedMembers.network),
    },
  } as T;
}

export interface SyncPushPlan {
  chainId: number;
  address: string;
  /** The lower-case address the server keys the record by. */
  key: string;
  rpcUrl: string;
}

/**
 * Whether a change is worth pushing to the sync server, and with what. `context` is the value BEFORE the change. `fallbackChainId` is used when the current chain is not set:
 * a network switch passes the NEW chain id (so it can still push); an account switch passes nothing.
 */
export function planSyncPush(
  context: { apiCoreSyncedMembers?: { accounts?: { activeAccount?: { address?: unknown } }; network?: NetworkSection } } | null | undefined,
  options: { address?: string; fallbackChainId?: number } = {},
): SyncPushPlan | null {
  const address = options.address ?? context?.apiCoreSyncedMembers?.accounts?.activeAccount?.address;
  const chainId = (Number(context?.apiCoreSyncedMembers?.network?.appChainId ?? 0) || options.fallbackChainId) ?? 0;
  const rpcUrl = String(context?.apiCoreSyncedMembers?.network?.rpcUrl ?? '');
  if (address && chainId && rpcUrl) return { chainId, address: String(address), key: String(address).toLowerCase(), rpcUrl };
  return null;
}
