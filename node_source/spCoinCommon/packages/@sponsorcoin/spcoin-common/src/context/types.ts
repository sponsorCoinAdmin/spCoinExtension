// File: spCoinCommon/src/context/types.ts
//
// Copied from lib/structure/exchangeContextCore/types/types.ts in the
// parent app repo (2026-09-06, build plan step 3 — see
// docs/design/spcoinPackagesDesign.md §4 there). Import paths adjusted
// to this package's own layout (SP_COIN_DISPLAY now comes from the
// sibling /panels subpath within this same package; STATUS/
// TRADE_DIRECTION/FEED_TYPE from this package's own enums.ts); content
// otherwise unchanged. `ContractRecs` below keeps its real dependency on
// wagmi's `UseReadContractReturnType` — declared as a peerDependency in
// this package's package.json, not stripped out, per step 4's "isolated
// build surfaces accidental dependencies" plan (this one is a real,
// intentional one, not accidental — kept, not fixed).

// 2026-09-23, real fix — moduleResolution moved to "node16" (fixing the
// deprecated "node10"/classic value the previous "node" setting silently
// aliased to). Under Node16 resolution, a type-only import into a CommonJS
// file (this package's own module type) from an ESM-only package needs an
// explicit resolution-mode attribute so `tsc` knows which condition of that
// package's `exports` map to resolve .d.ts files from at type-check time —
// this never affects emitted JS (type-only imports are always erased).
import type { Address } from 'viem' with { 'resolution-mode': 'import' };
import type { UseReadContractReturnType } from 'wagmi' with { 'resolution-mode': 'import' };
import type { STATUS, TRADE_DIRECTION, FEED_TYPE } from './enums';
import type { SP_COIN_DISPLAY } from '../panels/spCoinDisplay';

/** Represents a generic wallet/account entity that can appear in selectors/panels. */
export interface spCoinAccount {
  name: string;
  symbol: string;
  type: string;
  website: string;
  description: string;
  status: STATUS;
  address: Address;
  logoURL?: string;
  email?: string;
  balance: bigint;
}

/** Who to claim rewards for */
export enum AccountType {
  SPONSOR = 'SPONSOR',
  RECIPIENT = 'RECIPIENT',
  AGENT = 'AGENT',
  ALL = 'ALL',
}

/** Useful for inputs where the raw string may still be in flight before validation. */
export interface AccountAddress {
  address: string | Address;
}

/**
 * One identity row (avatar + "ROLE: symbol: name") MessagePanel renders
 * above the plain-text body.
 */
export interface MessageAccountEntry {
  role: 'SPONSOR' | 'RECIPIENT' | 'AGENT' | 'ACCOUNT';
  account: spCoinAccount;
  /** Optional single line rendered indented directly under this specific account's row. */
  detail?: string;
}

/** One token identity row (icon + "label: symbol: name") — MessagePanel's token-side counterpart to MessageAccountEntry. */
export interface MessageTokenEntry {
  label: string;
  token: TokenContract;
  /** Optional single line rendered indented under this token's row (e.g. the formatted amount). */
  detail?: string;
}

/**
 * Embedded in ErrorMessage.msg by callers to mark exactly where
 * MessagePanel should render the accounts/amount block.
 */
export const MESSAGE_ACCOUNTS_MARKER = '<<<MESSAGE_ACCOUNTS_MARKER>>>';

/** A single prominent "Label: value" line rendered alongside `accounts`. */
export interface MessageAmountEntry {
  label: string;
  value: string;
}

/** Uniform error shape for UI & API errors. */
export interface ErrorMessage {
  errCode: number;
  msg: string;
  source: string;
  status: STATUS;
  /** Optional account identities shown above the plain-text body. */
  accounts?: MessageAccountEntry[];
  /** Optional token identities shown above the plain-text body, alongside `accounts`. */
  tokens?: MessageTokenEntry[];
  /** Optional prominent amount line shown alongside `accounts`. */
  amount?: MessageAmountEntry;
  /** Optional short "why this happened" line, distinct from the full `msg` body. */
  reason?: string;
  /** Optional gas fee actually paid/estimated for this transaction. */
  gasFee?: string;
}

export interface ContractRecs {
  nameRec: UseReadContractReturnType;
  symbolRec: UseReadContractReturnType;
  decimalRec: UseReadContractReturnType;
  totalSupplyRec: UseReadContractReturnType;
}

/** All known accounts tracked by the app. */
export interface Accounts {
  activeAccount?: spCoinAccount;
  spCoinOwnerAccount?: spCoinAccount;
  sponsorAccount?: spCoinAccount;
  recipientAccount?: spCoinAccount;
  agentAccount?: spCoinAccount;
  sponsorAccounts?: spCoinAccount[];
  recipientAccounts?: spCoinAccount[];
  agentAccounts?: spCoinAccount[];
  /** The chosen Send recipient. Same spCoinAccount shape/hydration path as the others above. */
  sendRecipientAddress?: spCoinAccount;
}

export interface DISPLAY_STACK_NODE {
  id: SP_COIN_DISPLAY; // authoritative
  name: string; // derived / non-authoritative
}

/** A single panel's ID + visibility — flat, no nesting. */
export interface DisplayPanel {
  panel: SP_COIN_DISPLAY;
  visible: boolean;
  /** Optional label for debug readability, mirrors PanelNode's own `name`. */
  name?: string;
}

export type DisplayPanels = DisplayPanel[];

export interface Settings {
  // apiTradingProvider and testPage are deliberately NOT part of this
  // shape — both were moved off the real ExchangeContext in the parent
  // app (2026-09-05) to real, independently-owned Web/Merit state. See
  // exchangeContextLibraryDesign.md's "Field-by-field execution" note in
  // the parent app repo for the full history.

  /** True if this ExchangeContext was hydrated from Local Storage on boot. */
  hydratedFromLocalStorage?: boolean;

  /** Show/hide testnets in network selector dropdown. */
  showTestNets?: boolean;

  /** Persisted SponsorCoin contract metadata shown in debug settings views. */
  spCoinContract?: {
    address: string;
    owner: string;
    version: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSypply: string;
    inflationRate: number;
    recipientRateRange: [number, number];
    agentRateRange: [number, number];
    /**
     * The contract's own rateMatchesIncrement step — a Recipient/Agent
     * Rate must land exactly on `range[0] + n * increment`, or the write
     * reverts. Defaults to 1 until read from chain.
     */
    recipientRateIncrement: number;
    agentRateIncrement: number;
  };

  /**
   * Per-@sponsorcoin-package local/node_modules source toggle, keyed by
   * package name. Renamed/generalized from a single spCoinAccessManager
   * field 2026-09-06, same day this package was scaffolded — kept in
   * sync by hand for now (see this package's own README "Status" note
   * on why it's a copy, not the live source of truth yet).
   */
  packageAccessManagers?: Record<string, {
    source: 'local' | 'node';
    activeNpmVersion: string;
    publishAccess: 'public' | 'private';
  }>;
}

/** (Legacy alias – kept only if you still import it elsewhere) */
export type DisplaySettings = Settings;

export interface NetworkElement {
  connected: boolean;
  appChainId: number;
  chainId: number;
  logoURL: string;
  name: string;
  symbol: string;
  url: string;
  rpcUrl?: string;
}

export interface Slippage {
  bps: number;
  percentage: number;
  percentageString: string;
}

export interface TokenContract {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  balance: bigint;
  amount?: bigint;
  chainId?: number;
  logoURL?: string;
  infoURL?: string;
  website?: string;
  description?: string;
  explorer?: string;
  links?: TokenExternalLink[];
  coin_type?: number;
  research?: string;
  rpc_url?: string;
  tags?: string[];
  /**
   * The account that deployed/holds contract-owner privileges on this
   * token. NOT the same as whichever wallet happens to be connected —
   * only populated for spCoin deployments.
   */
  ownerAccount?: Address;
}

export interface TokenExternalLink {
  name: string;
  url: string;
}

export interface TradeData {
  buyTokenContract?: TokenContract;
  sellTokenContract?: TokenContract;
  sendTokenContract?: TokenContract;
  previewTokenContract?: TokenContract;
  previewTokenSource?: 'BUY' | 'SELL' | null;
  rateRatio: number;
  slippage: Slippage;
  tradeDirection: TRADE_DIRECTION;
}

/**
 * Per-tab "shadow" copies of the sell/buy token pair. `tradeData.sellTokenContract`/
 * `buyTokenContract` remain the single pair every price/balance/FSM consumer reads —
 * this just remembers what each tab's pair was so it can be restored when switching
 * back, instead of tabs clobbering each other's selection.
 */
export interface ActiveTokens {
  /**
   * Single source of truth for "the currently active spCoin contract
   * address." Stored as a full TokenContract (same shape/hydration path
   * as the fields below) rather than a bare address.
   */
  activeSpCoinAddress?: TokenContract;
  swapSellTokenContract?: TokenContract;
  swapBuyTokenContract?: TokenContract;
  sponsorSellTokenContract?: TokenContract;
  // sponsorBuyTokenContract removed (2026-09-08, on request) — the Sponsor
  // tab's "buy" side is always the active spCoin contract being staked to,
  // never an independent per-tab selection like every other slot here, so
  // it's identical to activeSpCoinAddress by definition. Every former
  // reader now reads activeSpCoinAddress directly instead.
}

export interface ExchangeContext {
  apiCoreSyncedMembers: APICoreSyncedMembers;
  settings: Settings;
  /**
   * 2026-09-17 re-sync — `apiErrorMessage` was MERGED into this field in
   * the parent app repo (2026-09-06); this package's own copy still had
   * both fields as two separate, stale entries until now. See the parent
   * app's `lib/structure/exchangeContextCore/types/types.ts` for the full
   * history.
   */
  errorMessage: ErrorMessage | undefined;
}

/**
 * The subset of ExchangeContext eligible for cross-process sync.
 *
 * `accounts` + `network` are shared because both processes must resolve
 * to the SAME value (one active account, one chain).
 *
 * `displayPanels` is shared for a related reason — with Merit Wallet
 * embedded in the same process today, the web page already remotely
 * controls/observes Merit's panel visibility (and vice versa) as one
 * shared array. `displayStack` (2026-09-17 re-sync: removed from here —
 * the parent app extracted it entirely on 2026-09-06, it's now real,
 * independently-owned state in `lib/context/exchangeContext/
 * displayStackStore.tsx`, a DERIVED result of openPanel/closePanel calls
 * rather than raw data to reconcile server-side) is NOT part of this
 * interface anymore.
 *
 * `tradeData` + `activeTokens` are NOT cross-process sync candidates —
 * genuinely process-local state, co-located here purely for the "one
 * container, not two" simplification.
 *
 * See exchangeContextLibraryDesign.md's "Target shape" section in the
 * parent app repo for the full design history behind this shape.
 */
export interface APICoreSyncedMembers {
  accounts: Accounts;
  network: NetworkElement;
  tradeData: TradeData;
  activeTokens: ActiveTokens;
  /**
   * The live panel-visibility state — flat, {panel, visible, name}[], no
   * nesting. Any nested tree view for display is built on demand from
   * this list plus the static panelRegistry.ts structure, not stored
   * anywhere.
   */
  displayPanels: DisplayPanels;
  /** 2026-09-17 re-sync (added to the parent app 2026-09-07, missing here until now) — see TradeExecutionLock's own doc comment. Optional/absent = no trade currently executing. */
  tradeExecutionLock?: TradeExecutionLock;
  /** 2026-09-17 re-sync — mirrors the real ExchangeContext.settings.showTestNets value on whichever side last pushed it. */
  showTestNets?: boolean;
  /** 2026-09-17 re-sync — see ExchangeContextPatch.packageAccessManagers's own doc comment. */
  packageAccessManagers?: Record<string, { source: 'local' | 'node'; activeNpmVersion: string; publishAccess: 'public' | 'private' }>;
}

/**
 * Cross-process "a real trade is being submitted right now" lock
 * (added to the parent app 2026-09-07; missing from this package's own
 * copy until the 2026-09-17 re-sync). NOT a mirror of `tradeData` itself
 * (the live, in-progress, unconfirmed form state deliberately stays
 * unsynced) — this represents the one moment a real transaction is in
 * flight, as a short-lived, self-expiring flag both sides gate input on.
 *
 * `expiresAt` is the real safety mechanism, not `active` alone: whichever
 * side did NOT initiate the trade has no way to know if the initiating
 * side crashed, lost connection, or closed its tab before it could push
 * `{active: false}` — without a hard ceiling, that would strand the other
 * side's UI locked out of input forever over a network blip. Every
 * consumer of this field MUST treat the lock as inactive once
 * `Date.now() > expiresAt`, regardless of what `active` says.
 */
export interface TradeExecutionLock {
  active: boolean;
  kind: 'stake' | 'sponsorStake' | 'sponsorSwap';
  contractAddress: string;
  chainId: number;
  startedAt: number;
  /** Hard ceiling (60s past `startedAt` in the parent app) — see this interface's own doc comment. */
  expiresAt: number;
  /**
   * Set on the SAME release push that flips `active` back to false. Only
   * ever present on a release (`active: false`) push, never on the
   * initial acquire — undefined there, not a stale/misleading default.
   */
  result?: {
    status: 'success' | 'error';
    /** Short, user-facing summary — NOT the full ErrorMessage.msg body. */
    summary: string;
  };
}

/**
 * The actual shape of a PATCH body for the parent app's sync-auth
 * client (pushExchangeContextPatch/patchServerApiCoreSyncedMembers).
 * `accounts`/`network`/`activeTokens`/`packageAccessManagers` merge one
 * level deep (or at the package-name level, for `packageAccessManagers`)
 * server-side — a caller only ever needs to send the field it's actually
 * changing. `displayPanels`/`tradeExecutionLock`/`showTestNets` stay
 * whole-value replace. 2026-09-17 re-sync: `displayStack` removed (not
 * part of `APICoreSyncedMembers` anymore, see that interface's own doc
 * comment); `tradeExecutionLock`/`activeTokens`/`showTestNets`/
 * `packageAccessManagers` added — all four existed in the parent app
 * since 2026-09-07 and were missing from this package's own copy until
 * now. `tradeData` is part of `APICoreSyncedMembers` but still NOT part
 * of a patch — genuinely process-local, deliberately excluded.
 */
export interface ExchangeContextPatch {
  accounts?: Partial<Accounts>;
  network?: Partial<NetworkElement>;
  displayPanels?: DisplayPanels;
  /** Whole-value replace, same as `displayPanels` — see TradeExecutionLock's own doc comment. */
  tradeExecutionLock?: TradeExecutionLock;
  /**
   * Both Web/Lab tooling and Merit's production UI read AND write this
   * for real (not one-sided). Merges one level deep server-side, same as
   * `accounts`/`network` — a caller only needs to send the one field
   * it's actually changing.
   */
  activeTokens?: Partial<ActiveTokens>;
  /** A low-frequency display toggle, not per-operation transient state — whole-value replace. */
  showTestNets?: boolean;
  /**
   * Confirmed genuinely shared (drives real `accessSource`/`readMode`
   * derivation on both sides), not a Web-only dev setting. Merges at the
   * PACKAGE-NAME level server-side — each package's own
   * `{source, activeNpmVersion, publishAccess}` value is still
   * whole-value replaced, a caller always sends the complete entry for
   * whichever package changed.
   */
  packageAccessManagers?: Record<string, { source: 'local' | 'node'; activeNpmVersion: string; publishAccess: 'public' | 'private' }>;
}

/**
 * Named consumer that wrote a given sync record — provenance metadata,
 * not part of APICoreSyncedMembers itself. Typed as a union for the
 * known names today; the parent app's server accepts any non-empty
 * string, so this is documentation/autocomplete, not a hard allowlist.
 */
export type ExchangeContextSyncSource =
  | 'WebExchangeContext'
  | 'MeritExchangeContext'
  | 'ApplePhoneExchangeContext'
  | 'AndroidExchangeContext';

export interface PriceRequestParams {
  chainId: number;
  buyAmount?: string;
  buyToken: Address | string;
  activeAccountAddr?: string;
  sellAmount?: string;
  sellToken: Address | string;
  slippageBps?: number;
}

export const ERROR_CODES = {
  CHAIN_SWITCH: 1001,
  PRICE_FETCH_ERROR: 2001,
  INVALID_TOKENS: 3001,
} as const;

export type AccountFeedType =
  | FEED_TYPE.REMOTE_RECIPIENT_ACCOUNTS
  | FEED_TYPE.REMOTE_AGENT_ACCOUNTS
  | FEED_TYPE.REMOTE_SPONSOR_ACCOUNTS
  | FEED_TYPE.REMOTE_ACCOUNT_SEND_LIST
  | FEED_TYPE.MANAGE_RECIPIENTS
  | FEED_TYPE.MANAGE_AGENTS
  | FEED_TYPE.WALLET_ACCOUNTS;

export type TokenFeedType = FEED_TYPE.REMOTE_TOKEN_LIST;

export interface FeedDebugMeta {
  sourceId?: string;
  sourceKind?: string;
  resolvedUrl?: string;
}

export type FeedData =
  | ({ feedType: TokenFeedType; tokens: TokenContract[] } & { __debug?: FeedDebugMeta })
  | ({ feedType: AccountFeedType; spCoinAccounts: spCoinAccount[] } & { __debug?: FeedDebugMeta });
