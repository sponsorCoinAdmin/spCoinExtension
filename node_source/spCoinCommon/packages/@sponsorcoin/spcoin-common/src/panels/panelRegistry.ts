// File: spCoinCommon/src/panels/panelRegistry.ts
//
// Canonical registry for ALL SponsorCoin panels. Copied from
// lib/structure/exchangeContext/registry/panelRegistry.ts in the parent
// app repo (2026-09-06, build plan step 3). Import paths adjusted to
// this package's own relative layout; content otherwise unchanged.
//
// Structural metadata only (NO UI logic):
//   • Panel definitions (PANEL_DEFS)
//   • Parent → child relationships
//   • Derived helpers (CHILDREN, KINDS, PANEL_BY_ID)
//
// Overlay membership lists are defined in panelGroups.ts.

import { SP_COIN_DISPLAY as SP } from './spCoinDisplay';

import {
  MAIN_RADIO_OVERLAY_PANELS as MAIN_RADIO_OVERLAY_PANELS_MODEL,
  MANAGE_SCOPED as MANAGE_SCOPED_MODEL,
  STACK_COMPONENTS as STACK_COMPONENTS_MODEL,
  IS_MAIN_RADIO_OVERLAY_PANEL,
  IS_MANAGE_SCOPED,
  IS_STACK_COMPONENT,
} from './panelGroups';

export type PanelKind = 'root' | 'panel' | 'button' | 'list' | 'control' | 'flag';

export type PanelDef = Readonly<{
  id: SP;
  kind: PanelKind;
  /** If true: participates in the GLOBAL overlay radio group (sourced from panelGroups.ts). */
  overlay?: boolean;
  /** Cold-start visibility (persisted state may override) */
  defaultVisible?: boolean;
  /** Structural children (tree shape only) */
  children?: readonly SP[];
}>;

/* ─────────────────────────────── Grouping Helpers ─────────────────────────────── */

const EXCHANGE_TRADING_PAIR_CHILDREN: readonly SP[] = [
  SP.SELL_SELECT_PANEL,
  SP.SWAP_ARROW_BUTTON,
  SP.ZERO_X_SELECT_PANEL,
  SP.UNI_SELECT_PANEL,
] as const;

// 2026-09-25, on request — CONNECT_TRADE_BUTTON/UNISWAP_TRADE_BUTTON no
// longer listed here as flat TRADING_STATION_PANEL siblings; each now
// nests under its own quote panel instead (CONFIG_SLIPPAGE_PANEL /
// UNI_SELECT_PANEL respectively — see those defs' own `children` below).
const TRADING_CHILDREN: readonly SP[] = [
  SP.EXCHANGE_TRADING_PAIR,
  SP.FEE_DISCLOSURE,
  SP.AFFILIATE_FEE,
] as const;

const SPONSOR_EXCHANGE_TRADING_PAIR_CHILDREN: readonly SP[] = [
  SP.STAKED_TOKEN_SELECT_PANEL,
  SP.RECIPIENT_SELECT_PANEL,
] as const;

const SPONSOR_CHILDREN: readonly SP[] = [
  SP.SPONSOR_SLIPPAGE_PANEL,
  SP.STAKING_CONTROLLER_PANEL,
  SP.SPONSOR_EXCHANGE_TRADING_PAIR,
  SP.SPONSOR_CONNECT_TRADE_BUTTON,
  SP.SPONSOR_FEE_DISCLOSURE,
  SP.SPONSOR_AFFILIATE_FEE,
] as const;

const ACCOUNT_LIST_REWARDS_CHILDREN: readonly SP[] = [
  SP.PENDING_SPONSOR_REWARDS,
  SP.PENDING_RECIPIENT_REWARDS,
  SP.PENDING_AGENT_REWARDS,
  SP.ACTIVE_SPONSORSHIPS,
] as const;

// 2026-09-08, two same-day rounds — AGENT_ACCOUNT removed first (its own
// AGENT_PANEL), then SPONSOR_ACCOUNT/RECIPIENT_ACCOUNT the same way
// (SPONSOR_PANEL/RECIPIENT_PANEL, see MAIN_RADIO_OVERLAY_PANELS in
// panelGroups.ts) — ACCOUNT_PANEL is now repurposed as ACTIVE_ACCOUNT's own
// dedicated view, with no sub-mode left to resolve at all.
const ACCOUNT_PANEL_CHILDREN: readonly SP[] = [
  SP.ACCOUNT_LOGO,
  SP.ACCOUNT_META_DATA,
] as const;

// 2026-09-08, same-day follow-up (on request) — AGENT_PANEL/
// SPONSOR_PANEL/RECIPIENT_PANEL each get their own LOGO/META_DATA
// children now, the same shape ACCOUNT_PANEL/TOKEN_PANEL/NETWORK_PANEL
// already have, instead of reusing ACCOUNT_LOGO/ACCOUNT_META_DATA (which
// would give those two ids two parents at once — PARENT_OF only tracks
// one). AccountPanelContent.tsx picks the right pair off its `mode` prop.
const AGENT_PANEL_CHILDREN: readonly SP[] = [
  SP.AGENT_LOGO,
  SP.AGENT_META_DATA,
] as const;

const SPONSOR_PANEL_CHILDREN: readonly SP[] = [
  SP.SPONSOR_LOGO,
  SP.SPONSOR_META_DATA,
] as const;

const RECIPIENT_PANEL_CHILDREN: readonly SP[] = [
  SP.RECIPIENT_LOGO,
  SP.RECIPIENT_META_DATA,
] as const;

const ASSET_LIST_SELECT_PANEL_CHILDREN: readonly SP[] = [
  SP.ACCOUNT_LIST_REWARDS_PANEL,
  SP.ADDRESS_PANEL,
  SP.ACTIVE_LIST_PANEL,
] as const;

const TOKEN_CONTRACT_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_META_DATA,
  SP.TOKEN_LOGO,
] as const;

const NETWORK_PANEL_CHILDREN: readonly SP[] = [
  SP.NETWORK_META_DATA,
  SP.NETWORK_LOGO,
] as const;

// 2026-09-08, same-day follow-up (on request) — one LOGO/META_DATA pair
// per activeTokens.* shadow slot, same shape as TOKEN_CONTRACT_PANEL_CHILDREN
// above. See TOKEN_BUY_PANEL's own enum doc comment for which slot each
// panel reads.
const TOKEN_BUY_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_BUY_LOGO,
  SP.TOKEN_BUY_META_DATA,
] as const;

const TOKEN_SELL_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_SELL_LOGO,
  SP.TOKEN_SELL_META_DATA,
] as const;

const TOKEN_BUY_SWAP_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_BUY_SWAP_LOGO,
  SP.TOKEN_BUY_SWAP_META_DATA,
] as const;

const TOKEN_SELL_SWAP_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_SELL_SWAP_LOGO,
  SP.TOKEN_SELL_SWAP_META_DATA,
] as const;

// 2026-09-09, on request — the Send tab's own token (tradeData.
// sendTokenContract), same LOGO/META_DATA shape as the 4 above.
const TOKEN_SEND_PANEL_CHILDREN: readonly SP[] = [
  SP.TOKEN_SEND_LOGO,
  SP.TOKEN_SEND_META_DATA,
] as const;

const PENDING_SPONSOR_CHILDREN: readonly SP[] = [] as const;
const PENDING_RECIPIENT_CHILDREN: readonly SP[] = [] as const;
const PENDING_AGENT_CHILDREN: readonly SP[] = [] as const;
const UNSPONSOR_CHILDREN: readonly SP[] = [] as const;

// 2026-09-08, on request — pure structural grouping under WALLET_RADIO_PANELS:
// the "pick an asset/party to view" detail panels nest here instead of
// being flat WALLET_RADIO_PANELS siblings. ACCOUNT_PANEL joined this group
// (2026-09-09, on request) — was a flat TRADE_HEADER_CHILDREN sibling of
// ASSET_PANELS itself, now nests inside it like every other role/asset
// detail panel. Each keeps its own existing MAIN_RADIO_OVERLAY_PANELS
// membership unchanged (this only changes display-tree nesting/PARENT_OF,
// not radio-exclusivity behavior).
const ASSET_PANELS_CHILDREN: readonly SP[] = [
  SP.ACCOUNT_PANEL,
  SP.AGENT_PANEL,
  SP.SPONSOR_PANEL,
  SP.RECIPIENT_PANEL,
  SP.TOKEN_PANEL,
  SP.TOKEN_BUY_PANEL,
  SP.TOKEN_SELL_PANEL,
  SP.TOKEN_BUY_SWAP_PANEL,
  SP.TOKEN_SELL_SWAP_PANEL,
  SP.TOKEN_SEND_PANEL,
  SP.NETWORK_PANEL,
] as const;

const TRADE_HEADER_CHILDREN: readonly SP[] = [
  SP.TRADING_STATION_PANEL,
  SP.ASSET_LIST_SELECT_PANEL,
  SP.MESSAGE_PANEL,
  SP.MANAGE_SPONSORSHIPS_PANEL,
  SP.SPONSOR_STAKING_LIST,
  SP.ACCOUNT_LIST_REWARDS_PANEL,
  SP.ASSET_PANELS,
  SP.MERIT_INFO_PANEL,
  SP.WALLET_CONFIG_PANEL,
  SP.SPONSORSHIP_PANEL,
  SP.SEND_PANEL,
  // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts's
  // own retirement note. Never actually opened via this radio group since
  // 2026-08-27 (MeritApprovalOrchestrator.tsx stopped navigating to it).
  SP.PASSWORD_PANEL,
] as const;

const RADIO_PANELS_CHILDREN: readonly SP[] = [
  ...TRADE_HEADER_CHILDREN,
] as const;

const MENU_TAB_HEADER_BAR_CHILDREN: readonly SP[] = [];
const PANEL_TITLE_CHILDREN: readonly SP[] = [];

const MERIT_WALLET_CHILDREN: readonly SP[] = [
  SP.WALLET_NETWORK_HEADER,
  SP.WALLET_ACCOUNT_HEADER,
  SP.AGENT_HEADER_PANEL,
  SP.PANEL_TITLE,
  SP.MENU_TAB_HEADER_BAR,
  SP.WALLET_RADIO_PANELS,
  SP.CHEVRON_DOWN_OPEN_PENDING,
] as const;

/* ─────────────────────────────── Panel Definitions ─────────────────────────────── */

/** Helper to auto-set overlay flag from action-model set. */
const def = (d: Omit<PanelDef, 'overlay'>): PanelDef => ({
  ...d,
  ...(IS_MAIN_RADIO_OVERLAY_PANEL.has(Number(d.id)) ? { overlay: true } : null),
});

export const PANEL_DEFS: readonly PanelDef[] = [
  def({ id: SP.MERIT_WALLET, kind: 'root', defaultVisible: true, children: MERIT_WALLET_CHILDREN }),
  def({ id: SP.TRADING_STATION_PANEL, kind: 'root', defaultVisible: true, children: TRADING_CHILDREN }),
  def({ id: SP.MENU_TAB_HEADER_BAR, kind: 'panel', defaultVisible: true, children: MENU_TAB_HEADER_BAR_CHILDREN }),
  def({ id: SP.WALLET_ACCOUNT_HEADER, kind: 'panel', defaultVisible: true, children: [SP.ACCOUNT_SELECT_DROP_DOWN, SP.ROLE_TABLE_COMPONENT] }),
  def({ id: SP.WALLET_RADIO_PANELS, kind: 'panel', defaultVisible: true, children: RADIO_PANELS_CHILDREN }),
  def({ id: SP.PANEL_TITLE, kind: 'panel', defaultVisible: true, children: PANEL_TITLE_CHILDREN }),
  def({ id: SP.ROLE_TABLE_COMPONENT, kind: 'panel', defaultVisible: true }),
  def({ id: SP.WALLET_NETWORK_HEADER, kind: 'panel', defaultVisible: true }),
  def({ id: SP.AGENT_HEADER_PANEL, kind: 'panel', defaultVisible: false, children: [SP.AGENT_SELECT_DROP_DOWN] }),
  def({ id: SP.AGENT_SELECT_DROP_DOWN, kind: 'panel', defaultVisible: false }),
  def({ id: SP.ASSET_LIST_SELECT_PANEL, kind: 'list', children: ASSET_LIST_SELECT_PANEL_CHILDREN }),
  def({ id: SP.ADDRESS_PANEL, kind: 'panel', defaultVisible: false, children: [] }),
  def({ id: SP.ACTIVE_LIST_PANEL, kind: 'panel', defaultVisible: false, children: [SP.LOCAL_ACCOUNT_WALLET_LIST, SP.NETWORK_LIST, SP.REMOTE_ACCOUNT_AGENT_LIST, SP.REMOTE_ACCOUNT_SEND_LIST, SP.REMOTE_ACCOUNT_RECIPIENT_LIST, SP.REMOTE_TOKEN_LIST] }),
  def({ id: SP.REMOTE_TOKEN_LIST, kind: 'flag' }),
  def({ id: SP.REMOTE_ACCOUNT_AGENT_LIST, kind: 'flag' }),
  def({ id: SP.REMOTE_ACCOUNT_RECIPIENT_LIST, kind: 'flag' }),
  def({ id: SP.REMOTE_ACCOUNT_SEND_LIST, kind: 'flag' }),
  def({ id: SP.NETWORK_LIST, kind: 'flag' }),
  def({ id: SP.LOCAL_ACCOUNT_WALLET_LIST, kind: 'flag', children: [SP.ADD_WALLET_ACCOUNT] }),
  def({ id: SP.ADD_WALLET_ACCOUNT, kind: 'panel', children: [SP.IMPORT_A_WALLET, SP.IMPORT_AN_ACCOUNT, SP.CONNECT_ACCOUNT, SP.CONNECT_HARDWARE_WALLET, SP.CREATE_ACCOUNT] }),
  def({ id: SP.IMPORT_A_WALLET, kind: 'flag' }),
  def({ id: SP.IMPORT_AN_ACCOUNT, kind: 'flag' }),
  def({ id: SP.CONNECT_ACCOUNT, kind: 'flag' }),
  def({ id: SP.CONNECT_HARDWARE_WALLET, kind: 'flag' }),
  def({ id: SP.CREATE_ACCOUNT, kind: 'flag' }),
  def({ id: SP.CHEVRON_DOWN_OPEN_PENDING, kind: 'flag' }),
  def({ id: SP.MESSAGE_PANEL, kind: 'panel' }),
  def({ id: SP.MANAGE_SPONSORSHIPS_PANEL, kind: 'panel', children: [SP.MANAGE_PENDING_REWARDS] }),
  def({ id: SP.MANAGE_PENDING_REWARDS, kind: 'panel' }),
  def({ id: SP.SPONSOR_STAKING_LIST, kind: 'panel', children: [] }),
  def({ id: SP.ACCOUNT_LIST_REWARDS_PANEL, kind: 'panel', children: ACCOUNT_LIST_REWARDS_CHILDREN }),
  def({ id: SP.PENDING_SPONSOR_REWARDS, kind: 'panel', children: PENDING_SPONSOR_CHILDREN }),
  def({ id: SP.PENDING_RECIPIENT_REWARDS, kind: 'panel', children: PENDING_RECIPIENT_CHILDREN }),
  def({ id: SP.PENDING_AGENT_REWARDS, kind: 'panel', children: PENDING_AGENT_CHILDREN }),
  def({ id: SP.ACTIVE_SPONSORSHIPS, kind: 'panel', children: UNSPONSOR_CHILDREN }),
  def({ id: SP.ACTIVE_ACCOUNT, kind: 'flag' }),
  def({ id: SP.SPONSOR_ACCOUNT, kind: 'flag' }),
  def({ id: SP.RECIPIENT_ACCOUNT, kind: 'flag' }),
  def({ id: SP.AGENT_ACCOUNT, kind: 'flag' }),
  def({ id: SP.ACCOUNT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.ACCOUNT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.AGENT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.AGENT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.SPONSOR_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.SPONSOR_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.RECIPIENT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.RECIPIENT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.STAKED_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.STAKED_RECIPIENT_SELECT_DROP_DOWN, kind: 'control', defaultVisible: false }),
  def({ id: SP.SELL_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.BUY_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.UNI_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.RECIPIENT_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
  def({ id: SP.TOKEN_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_BUY_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_BUY_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SELL_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SELL_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_BUY_SWAP_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_BUY_SWAP_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SELL_SWAP_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SELL_SWAP_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SEND_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.TOKEN_SEND_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.NETWORK_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.NETWORK_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
  // 2026-09-08, on request — pure grouping BRANCH for the "pick an
  // asset/party to view" panels below (see ASSET_PANELS_CHILDREN above and
  // its own enum doc comment), same shape as WALLET_RADIO_PANELS one level up:
  // defaultVisible:true (structural, always on — not something a user
  // opens/closes) and not itself a MAIN_RADIO_OVERLAY_PANELS member. Its
  // children keep their own independent radio-exclusivity membership
  // completely unchanged; this is display-tree organization only.
  def({ id: SP.ASSET_PANELS, kind: 'panel', defaultVisible: true, children: ASSET_PANELS_CHILDREN }),
  // Active/connected account's own view — nested under ASSET_PANELS
  // (2026-09-09, on request) alongside every other role/asset detail panel,
  // instead of sitting as a flat TRADE_HEADER_CHILDREN sibling of it.
  def({ id: SP.ACCOUNT_PANEL, kind: 'panel', children: ACCOUNT_PANEL_CHILDREN }),
  // Dedicated agent-account view, with its own LOGO/META_DATA children
  // (AGENT_PANEL_CHILDREN above) — same shape as ACCOUNT_PANEL/TOKEN_PANEL/
  // NETWORK_PANEL, each toggled independently of the other 3 role panels.
  def({ id: SP.AGENT_PANEL, kind: 'panel', children: AGENT_PANEL_CHILDREN }),
  // The other 2 roles that used to share ACCOUNT_PANEL, given the same
  // treatment as AGENT_PANEL above.
  def({ id: SP.SPONSOR_PANEL, kind: 'panel', children: SPONSOR_PANEL_CHILDREN }),
  def({ id: SP.RECIPIENT_PANEL, kind: 'panel', children: RECIPIENT_PANEL_CHILDREN }),
  def({ id: SP.TOKEN_PANEL, kind: 'panel', children: TOKEN_CONTRACT_PANEL_CHILDREN }),
  // Dedicated buy/sell token detail views — see TOKEN_BUY_PANEL's own enum
  // doc comment for which activeTokens.* slot each one reads.
  def({ id: SP.TOKEN_BUY_PANEL, kind: 'panel', children: TOKEN_BUY_PANEL_CHILDREN }),
  def({ id: SP.TOKEN_SELL_PANEL, kind: 'panel', children: TOKEN_SELL_PANEL_CHILDREN }),
  def({ id: SP.TOKEN_BUY_SWAP_PANEL, kind: 'panel', children: TOKEN_BUY_SWAP_PANEL_CHILDREN }),
  def({ id: SP.TOKEN_SELL_SWAP_PANEL, kind: 'panel', children: TOKEN_SELL_SWAP_PANEL_CHILDREN }),
  // Send tab's own token detail view — reads tradeData.sendTokenContract
  // directly, its own dedicated field (not a swap*/sponsor* shadow pair).
  def({ id: SP.TOKEN_SEND_PANEL, kind: 'panel', children: TOKEN_SEND_PANEL_CHILDREN }),
  def({ id: SP.NETWORK_PANEL, kind: 'panel', children: NETWORK_PANEL_CHILDREN }),
  def({ id: SP.MERIT_INFO_PANEL, kind: 'panel' }),
  def({ id: SP.EXCHANGE_TRADING_PAIR, kind: 'panel', defaultVisible: true, children: EXCHANGE_TRADING_PAIR_CHILDREN }),
  def({ id: SP.SELL_SELECT_PANEL, kind: 'panel', defaultVisible: true, children: [SP.SELL_TOKEN_SELECT_DROP_DOWN] }),
  // 2026-09-25, corrected same day — CONNECT_TRADE_BUTTON nests directly
  // under ZERO_X_SELECT_PANEL (not CONFIG_SLIPPAGE_PANEL, which defaults
  // closed and hid it from this tree entirely when it was nested there).
  def({ id: SP.ZERO_X_SELECT_PANEL, kind: 'panel', defaultVisible: true, children: [SP.CONFIG_SLIPPAGE_PANEL, SP.BUY_TOKEN_SELECT_DROP_DOWN, SP.CONNECT_TRADE_BUTTON] }),
  def({ id: SP.UNI_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [SP.UNI_TOKEN_SELECT_DROP_DOWN, SP.UNISWAP_TRADE_BUTTON] }),
  def({ id: SP.ACCOUNT_SELECT_DROP_DOWN, kind: 'panel', defaultVisible: true, children: [] }),
  def({ id: SP.CONFIG_SLIPPAGE_PANEL, kind: 'panel' }),
  def({ id: SP.SWAP_ARROW_BUTTON, kind: 'control', defaultVisible: true }),
  def({ id: SP.CONNECT_TRADE_BUTTON, kind: 'control', defaultVisible: true }),
  def({ id: SP.UNISWAP_TRADE_BUTTON, kind: 'control', defaultVisible: false }),
  def({ id: SP.WALLET_CONFIG_PANEL, kind: 'control', defaultVisible: false }),
  def({ id: SP.SPONSORSHIP_PANEL, kind: 'panel', defaultVisible: false, children: SPONSOR_CHILDREN }),
  def({ id: SP.SPONSOR_SLIPPAGE_PANEL, kind: 'panel', defaultVisible: false }),
  def({ id: SP.SPONSOR_EXCHANGE_TRADING_PAIR, kind: 'panel', defaultVisible: false, children: SPONSOR_EXCHANGE_TRADING_PAIR_CHILDREN }),
  def({ id: SP.STAKED_TOKEN_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [SP.TOKEN_SELECT_DROP_DOWN] }),
  def({ id: SP.RECIPIENT_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [SP.STAKED_TOKEN_SELECT_DROP_DOWN, SP.STAKED_RECIPIENT_SELECT_DROP_DOWN] }),
  def({ id: SP.STAKING_CONTROLLER_PANEL, kind: 'panel', defaultVisible: false, children: [SP.SPONSOR_CONFIG_PANEL] }),
  def({ id: SP.SPONSOR_CONFIG_PANEL, kind: 'panel', defaultVisible: false }),
  def({ id: SP.SPONSOR_CONNECT_TRADE_BUTTON, kind: 'control', defaultVisible: false }),
  def({ id: SP.SPONSOR_FEE_DISCLOSURE, kind: 'panel', defaultVisible: false }),
  def({ id: SP.SPONSOR_AFFILIATE_FEE, kind: 'panel', defaultVisible: false }),
  def({ id: SP.SEND_PANEL, kind: 'panel', defaultVisible: false, children: [SP.SEND_SELECT_PANEL, SP.SEND_ADDRESS_HEADER_BAR, SP.SEND_BUTTON] }),
  // PROCESS_FLOW def removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
  def({ id: SP.PASSWORD_PANEL, kind: 'panel', defaultVisible: false }),
  def({ id: SP.SEND_BUTTON, kind: 'button', defaultVisible: true }),
  def({ id: SP.SEND_TITLE, kind: 'panel', defaultVisible: true }),
  def({ id: SP.SEND_ADDRESS_HEADER_BAR, kind: 'panel', defaultVisible: true, children: [SP.ACCOUNT_SELECT_DROP_DOWN, SP.ACTIVE_ACCOUNT_ADDRESS_EXPANDED] }),
  def({ id: SP.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, kind: 'panel', defaultVisible: true }),
  def({ id: SP.TOKEN_ADDRESS_COMPONENT, kind: 'panel', defaultVisible: true }),
  def({ id: SP.SEND_TO_ADDRESS, kind: 'panel', defaultVisible: true }),
  def({ id: SP.SEND_SELECT_PANEL, kind: 'panel', defaultVisible: true }),
  def({ id: SP.FEE_DISCLOSURE, kind: 'panel', defaultVisible: true }),
  def({ id: SP.AFFILIATE_FEE, kind: 'panel' }),
  def({ id: SP.NETWORK_SELECTION_POPUP, kind: 'panel', defaultVisible: false }),
  def({ id: SP.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, kind: 'panel', defaultVisible: false }),
  def({ id: SP.TOKEN_LIST_OVERLAY_SPONSOR_LAB, kind: 'panel', defaultVisible: false }),
  def({ id: SP.ACCOUNT_SELECTION_POPUP, kind: 'panel', defaultVisible: false }),
] as const;

/* ─────────────────────────────── Derived Helpers ─────────────────────────────── */

export const MAIN_RADIO_OVERLAY_PANELS: readonly SP[] = MAIN_RADIO_OVERLAY_PANELS_MODEL;
export const MANAGE_SCOPED: readonly SP[] = MANAGE_SCOPED_MODEL;
export const STACK_COMPONENTS: readonly SP[] = STACK_COMPONENTS_MODEL;

export { IS_MAIN_RADIO_OVERLAY_PANEL, IS_MANAGE_SCOPED, IS_STACK_COMPONENT };

export const NON_INDEXED_PANELS = new Set<SP>([
  SP.MERIT_WALLET,
  SP.CONFIG_SLIPPAGE_PANEL,
  SP.MENU_TAB_HEADER_BAR,
  SP.WALLET_ACCOUNT_HEADER,
  SP.WALLET_RADIO_PANELS,
  SP.PANEL_TITLE,
  SP.WALLET_NETWORK_HEADER,
  SP.AGENT_HEADER_PANEL,
  SP.AGENT_SELECT_DROP_DOWN,
  SP.SEND_TITLE,
  SP.TOKEN_ADDRESS_COMPONENT,
  SP.SEND_SELECT_PANEL,
]);

export const ROOTS: readonly SP[] = [
  SP.MERIT_WALLET,
  SP.NETWORK_SELECTION_POPUP,
  SP.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER,
  SP.TOKEN_LIST_OVERLAY_SPONSOR_LAB,
  SP.ACCOUNT_SELECTION_POPUP,
] as const;

/** Fast id → definition lookup */
export const PANEL_BY_ID: ReadonlyMap<SP, PanelDef> = (() => {
  const m = new Map<SP, PanelDef>();
  for (const d of PANEL_DEFS) m.set(d.id, d);
  return m;
})();

/** parent → children (from defs that declare children) */
export const CHILDREN: Partial<Record<SP, readonly SP[]>> = (() => {
  const acc: Partial<Record<SP, readonly SP[]>> = {};
  for (const d of PANEL_DEFS) {
    if (d.children?.length) acc[d.id] = d.children;
  }
  return acc;
})();

/** child → parent (inverse of CHILDREN) */
export const PARENT_OF: Partial<Record<SP, SP>> = (() => {
  const acc: Partial<Record<SP, SP>> = {};
  for (const [parentIdStr, children] of Object.entries(CHILDREN)) {
    const parentId = Number(parentIdStr) as SP;
    for (const child of children ?? []) acc[child] = parentId;
  }
  return acc;
})();

/** id → kind */
export const KINDS: Partial<Record<SP, PanelKind>> = (() => {
  const acc: Partial<Record<SP, PanelKind>> = {};
  for (const d of PANEL_DEFS) acc[d.id] = d.kind;
  return acc;
})();

/** Dev-only guard: enforce unique ids in PANEL_DEFS */
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<SP>();
  for (const d of PANEL_DEFS) {
    if (seen.has(d.id)) {
      // eslint-disable-next-line no-console
      console.error('[panelRegistry] Duplicate PANEL_DEFS id:', d.id, d);
      throw new Error(`[panelRegistry] Duplicate PANEL_DEFS id: ${String(d.id)}`);
    }
    seen.add(d.id);
  }
}

export { defaultSpCoinPanelTree } from './defaultPanelTree';
