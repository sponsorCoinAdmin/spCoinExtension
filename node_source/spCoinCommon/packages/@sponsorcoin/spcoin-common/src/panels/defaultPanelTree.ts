// File: spCoinCommon/src/panels/defaultPanelTree.ts
//
// Copied from lib/structure/exchangeContext/constants/defaultPanelTree.ts
// in the parent app repo (2026-09-06, build plan step 3). Import paths
// adjusted to this package's own relative layout; content otherwise
// unchanged. Note: this file's own `flattenPanelTree`/`FlatPanel` are a
// DIFFERENT function/type than panelPersistence.ts's `flattenPersistedPanelTree`
// in this same package — same underlying idea (walk a panel tree into a
// flat list), different input shapes (`PanelNode[]` here vs.
// `PersistedPanelNode[]` there), never colliding in the parent app
// because they lived in different files under different names
// (`flattenPanelTree` in both, actually — see index.ts's own comment on
// why one had to be renamed when both landed in one package).

import type { SpCoinPanelTree, PanelNode } from './panelNode';
import { SP_COIN_DISPLAY as SP } from './spCoinDisplay';

/* ─────────────────────────── helpers ─────────────────────────── */

const panelName = (panel: SP) => SP[panel] ?? String(panel);

/**
 * Create a PanelNode with a derived `name` and optional children.
 * - `children` are only added if the array is non-empty.
 */
const node = (panel: SP, visible: boolean, children?: PanelNode[]): PanelNode => ({
  panel,
  name: panelName(panel),
  visible,
  ...(children?.length ? { children } : {}),
});

/* ──────────────── Single Source of Truth (SSoT) ───────────────── */

/** Panels that should NOT be persisted/seeded from the canonical tree. */
export const NON_PERSISTED_PANELS = new Set<SP>([]);

export const MUST_INCLUDE_ON_BOOT: readonly (readonly [SP, boolean])[] = [
  [SP.MERIT_WALLET, true],
  [SP.MENU_TAB_HEADER_BAR, true],
  [SP.WALLET_NETWORK_HEADER, true],
  [SP.WALLET_ACCOUNT_HEADER, true],
  [SP.WALLET_RADIO_PANELS, true],
  [SP.PANEL_TITLE, true],
  [SP.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, true],
  [SP.AGENT_HEADER_PANEL, false],
  [SP.TRADING_STATION_PANEL, true],
  [SP.CONFIG_SLIPPAGE_PANEL, false],
  [SP.EXCHANGE_TRADING_PAIR, true],
  [SP.SELL_SELECT_PANEL, true],
  [SP.ZERO_X_SELECT_PANEL, true],
  [SP.UNI_SELECT_PANEL, false],
  [SP.SWAP_ARROW_BUTTON, true],
  [SP.CONNECT_TRADE_BUTTON, true],
  [SP.UNISWAP_TRADE_BUTTON, false],
  [SP.WALLET_CONFIG_PANEL, false],
  [SP.FEE_DISCLOSURE, true],
  [SP.AFFILIATE_FEE, false],
  [SP.ACCOUNT_PANEL, false],
  // ASSET_PANELS: structural branch, always visible — same shape as
  // WALLET_RADIO_PANELS one level up (see its own enum doc comment).
  [SP.ASSET_PANELS, true],
  [SP.AGENT_PANEL, false],
  [SP.AGENT_LOGO, true],
  [SP.AGENT_META_DATA, true],
  [SP.SPONSOR_PANEL, false],
  [SP.SPONSOR_LOGO, true],
  [SP.SPONSOR_META_DATA, true],
  [SP.RECIPIENT_PANEL, false],
  [SP.RECIPIENT_LOGO, true],
  [SP.RECIPIENT_META_DATA, true],
  [SP.ASSET_LIST_SELECT_PANEL, false],
  [SP.ACTIVE_ACCOUNT, false],
  [SP.SPONSOR_ACCOUNT, false],
  [SP.RECIPIENT_ACCOUNT, false],
  [SP.AGENT_ACCOUNT, false],
  [SP.ACCOUNT_LOGO, true],
  [SP.ACCOUNT_META_DATA, true],
  [SP.TOKEN_PANEL, false],
  [SP.TOKEN_META_DATA, true],
  [SP.TOKEN_LOGO, true],
  [SP.TOKEN_BUY_PANEL, false],
  [SP.TOKEN_BUY_LOGO, true],
  [SP.TOKEN_BUY_META_DATA, true],
  [SP.TOKEN_SELL_PANEL, false],
  [SP.TOKEN_SELL_LOGO, true],
  [SP.TOKEN_SELL_META_DATA, true],
  [SP.TOKEN_BUY_SWAP_PANEL, false],
  [SP.TOKEN_BUY_SWAP_LOGO, true],
  [SP.TOKEN_BUY_SWAP_META_DATA, true],
  [SP.TOKEN_SELL_SWAP_PANEL, false],
  [SP.TOKEN_SELL_SWAP_LOGO, true],
  [SP.TOKEN_SELL_SWAP_META_DATA, true],
  [SP.TOKEN_SEND_PANEL, false],
  [SP.TOKEN_SEND_LOGO, true],
  [SP.TOKEN_SEND_META_DATA, true],
  [SP.NETWORK_PANEL, false],
  [SP.NETWORK_META_DATA, true],
  [SP.NETWORK_LOGO, true],
  [SP.MERIT_INFO_PANEL, false],
  [SP.MANAGE_SPONSORSHIPS_PANEL, false],
  [SP.CHEVRON_DOWN_OPEN_PENDING, false],
  [SP.SPONSORSHIP_PANEL, false],
  [SP.SEND_PANEL, false],
  // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
  [SP.PASSWORD_PANEL, false],
  [SP.SEND_SELECT_PANEL, true],
  [SP.SEND_ADDRESS_HEADER_BAR, true],
  [SP.SEND_BUTTON, true],
  [SP.ADDRESS_PANEL, false],
  [SP.ACTIVE_LIST_PANEL, false],
  [SP.REMOTE_TOKEN_LIST, false],
  [SP.REMOTE_ACCOUNT_AGENT_LIST, false],
  [SP.REMOTE_ACCOUNT_RECIPIENT_LIST, false],
  [SP.REMOTE_ACCOUNT_SEND_LIST, false],
  [SP.NETWORK_LIST, false],
  [SP.LOCAL_ACCOUNT_WALLET_LIST, false],
  [SP.ADD_WALLET_ACCOUNT, false],
  [SP.IMPORT_A_WALLET, false],
  [SP.IMPORT_AN_ACCOUNT, false],
  [SP.CONNECT_ACCOUNT, false],
  [SP.CONNECT_HARDWARE_WALLET, false],
  [SP.CREATE_ACCOUNT, false],
  [SP.SELL_TOKEN_SELECT_DROP_DOWN, true],
  [SP.BUY_TOKEN_SELECT_DROP_DOWN, true],
  [SP.UNI_TOKEN_SELECT_DROP_DOWN, true],
  [SP.SPONSOR_EXCHANGE_TRADING_PAIR, true],
  [SP.STAKED_TOKEN_SELECT_PANEL, true],
  [SP.RECIPIENT_SELECT_PANEL, true],
  [SP.SPONSOR_CONNECT_TRADE_BUTTON, true],
  [SP.NETWORK_SELECTION_POPUP, false],
  [SP.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, false],
  [SP.TOKEN_LIST_OVERLAY_SPONSOR_LAB, false],
  [SP.ACCOUNT_SELECTION_POPUP, false],
] as const;

/** Canonical authored tree for the SponsorCoin UI. */
export const defaultSpCoinPanelTree: SpCoinPanelTree = [
  node(SP.MERIT_WALLET, true, [
    node(SP.WALLET_NETWORK_HEADER, true),
    node(SP.WALLET_ACCOUNT_HEADER, true, [node(SP.ACCOUNT_SELECT_DROP_DOWN, true), node(SP.ROLE_TABLE_COMPONENT, true)]),
    node(SP.AGENT_HEADER_PANEL, false, [node(SP.AGENT_SELECT_DROP_DOWN, false)]),
    node(SP.PANEL_TITLE, true),
    node(SP.MENU_TAB_HEADER_BAR, true),
    node(SP.WALLET_RADIO_PANELS, true, [
      node(SP.TRADING_STATION_PANEL, true, [
        // 2026-09-25, corrected same day — CONNECT_TRADE_BUTTON nests
        // directly under ZERO_X_SELECT_PANEL (not CONFIG_SLIPPAGE_PANEL,
        // which defaults closed and hid it from the debug tree entirely
        // when it was nested there) and UNISWAP_TRADE_BUTTON nests under
        // UNI_SELECT_PANEL — each was a flat TRADING_STATION_PANEL
        // sibling of EXCHANGE_TRADING_PAIR before, mirroring each
        // button's real 1:1 pairing with its own quote panel in the
        // tree, not just visually in the UI.
        node(SP.CONFIG_SLIPPAGE_PANEL, false),
        node(SP.EXCHANGE_TRADING_PAIR, true, [
          node(SP.SELL_SELECT_PANEL, true, [
            node(SP.SELL_TOKEN_SELECT_DROP_DOWN, true),
          ]),
          node(SP.SWAP_ARROW_BUTTON, true),
          node(SP.ZERO_X_SELECT_PANEL, true, [
            node(SP.BUY_TOKEN_SELECT_DROP_DOWN, true),
            node(SP.CONNECT_TRADE_BUTTON, true),
          ]),
          node(SP.UNI_SELECT_PANEL, false, [
            node(SP.UNI_TOKEN_SELECT_DROP_DOWN, true),
            node(SP.UNISWAP_TRADE_BUTTON, false),
          ]),
        ]),
        node(SP.FEE_DISCLOSURE, true),
        node(SP.AFFILIATE_FEE, false),
      ]),
      node(SP.ASSET_LIST_SELECT_PANEL, false, [
        node(SP.ADDRESS_PANEL, false),
        node(SP.ACTIVE_LIST_PANEL, false, [
          node(SP.LOCAL_ACCOUNT_WALLET_LIST, false, [
            node(SP.ADD_WALLET_ACCOUNT, false, [
              node(SP.IMPORT_A_WALLET, false),
              node(SP.IMPORT_AN_ACCOUNT, false),
              node(SP.CONNECT_ACCOUNT, false),
              node(SP.CONNECT_HARDWARE_WALLET, false),
              node(SP.CREATE_ACCOUNT, false),
            ]),
          ]),
          node(SP.NETWORK_LIST, false),
          node(SP.REMOTE_ACCOUNT_AGENT_LIST, false),
          node(SP.REMOTE_ACCOUNT_SEND_LIST, false),
          node(SP.REMOTE_ACCOUNT_RECIPIENT_LIST, false),
          node(SP.REMOTE_TOKEN_LIST, false),
        ]),
      ]),
      node(SP.MESSAGE_PANEL, false),
      node(SP.MERIT_INFO_PANEL, false),
      node(SP.MANAGE_SPONSORSHIPS_PANEL, false, [node(SP.MANAGE_PENDING_REWARDS, false)]),
      node(SP.SPONSOR_STAKING_LIST, false),
      node(SP.ACCOUNT_LIST_REWARDS_PANEL, false, [
        node(SP.PENDING_SPONSOR_REWARDS, false),
        node(SP.PENDING_RECIPIENT_REWARDS, false),
        node(SP.PENDING_AGENT_REWARDS, false),
        node(SP.ACTIVE_SPONSORSHIPS, false),
      ]),
      // ASSET_PANELS: structural branch, always visible — same shape as
      // WALLET_RADIO_PANELS one level up.
      node(SP.ASSET_PANELS, true, [
        // ACCOUNT_PANEL: nested here (2026-09-09, on request) alongside
        // every other role/asset detail panel — was a flat WALLET_RADIO_PANELS
        // sibling of ASSET_PANELS itself.
        node(SP.ACCOUNT_PANEL, false, [
          node(SP.ACCOUNT_LOGO, true),
          node(SP.ACCOUNT_META_DATA, true),
        ]),
        node(SP.AGENT_PANEL, false, [
          node(SP.AGENT_LOGO, true),
          node(SP.AGENT_META_DATA, true),
        ]),
        node(SP.SPONSOR_PANEL, false, [
          node(SP.SPONSOR_LOGO, true),
          node(SP.SPONSOR_META_DATA, true),
        ]),
        node(SP.RECIPIENT_PANEL, false, [
          node(SP.RECIPIENT_LOGO, true),
          node(SP.RECIPIENT_META_DATA, true),
        ]),
        node(SP.TOKEN_PANEL, false, [
          node(SP.TOKEN_META_DATA, true),
          node(SP.TOKEN_LOGO, true),
        ]),
        node(SP.TOKEN_BUY_PANEL, false, [
          node(SP.TOKEN_BUY_LOGO, true),
          node(SP.TOKEN_BUY_META_DATA, true),
        ]),
        node(SP.TOKEN_SELL_PANEL, false, [
          node(SP.TOKEN_SELL_LOGO, true),
          node(SP.TOKEN_SELL_META_DATA, true),
        ]),
        node(SP.TOKEN_BUY_SWAP_PANEL, false, [
          node(SP.TOKEN_BUY_SWAP_LOGO, true),
          node(SP.TOKEN_BUY_SWAP_META_DATA, true),
        ]),
        node(SP.TOKEN_SELL_SWAP_PANEL, false, [
          node(SP.TOKEN_SELL_SWAP_LOGO, true),
          node(SP.TOKEN_SELL_SWAP_META_DATA, true),
        ]),
        node(SP.TOKEN_SEND_PANEL, false, [
          node(SP.TOKEN_SEND_LOGO, true),
          node(SP.TOKEN_SEND_META_DATA, true),
        ]),
        node(SP.NETWORK_PANEL, false, [
          node(SP.NETWORK_META_DATA, true),
          node(SP.NETWORK_LOGO, true),
        ]),
      ]),
      node(SP.WALLET_CONFIG_PANEL, false),
      node(SP.SPONSORSHIP_PANEL, false, [
        node(SP.SPONSOR_SLIPPAGE_PANEL, false),
        node(SP.STAKING_CONTROLLER_PANEL, true, [
          node(SP.SPONSOR_CONFIG_PANEL, false),
        ]),
        node(SP.SPONSOR_EXCHANGE_TRADING_PAIR, true, [
          node(SP.STAKED_TOKEN_SELECT_PANEL, true, [
            node(SP.TOKEN_SELECT_DROP_DOWN, true),
          ]),
          node(SP.RECIPIENT_SELECT_PANEL, true, [
            node(SP.STAKED_TOKEN_SELECT_DROP_DOWN, false),
            node(SP.STAKED_RECIPIENT_SELECT_DROP_DOWN, true),
          ]),
        ]),
        node(SP.SPONSOR_CONNECT_TRADE_BUTTON, true),
        node(SP.SPONSOR_FEE_DISCLOSURE, true),
        node(SP.SPONSOR_AFFILIATE_FEE, false),
      ]),
      node(SP.SEND_PANEL, false, [
        node(SP.SEND_SELECT_PANEL, true),
        node(SP.SEND_ADDRESS_HEADER_BAR, true, [
          node(SP.ACCOUNT_SELECT_DROP_DOWN, true),
          node(SP.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, true),
        ]),
        node(SP.SEND_BUTTON, true),
      ]),
      // PROCESS_FLOW node removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
      node(SP.PASSWORD_PANEL, false),
    ]),
    node(SP.CHEVRON_DOWN_OPEN_PENDING, false),
  ]),
  node(SP.NETWORK_SELECTION_POPUP, false),
  node(SP.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, false),
  node(SP.TOKEN_LIST_OVERLAY_SPONSOR_LAB, false),
  node(SP.ACCOUNT_SELECTION_POPUP, false),
];

/* ────────────────────────── utilities ─────────────────────────── */

export interface FlatPanel {
  panel: SP;
  name: string;
  visible: boolean;
}

/** Single-pass flatten (iterative; no nested closures) */
export function flattenPanelTree(nodes: PanelNode[]): FlatPanel[] {
  const out: FlatPanel[] = [];
  const stack: PanelNode[] = [...nodes].reverse();

  while (stack.length) {
    const n = stack.pop()!;
    out.push({
      panel: n.panel,
      name: n.name ?? panelName(n.panel),
      visible: !!n.visible,
    });

    if (n.children?.length) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
    }
  }

  return out;
}

/** Flatten once, reuse everywhere */
const DEFAULT_FLAT = flattenPanelTree(defaultSpCoinPanelTree);

export const DEFAULT_PANEL_ORDER: readonly SP[] = DEFAULT_FLAT.map((p) => p.panel) as readonly SP[];

/** Seed persisted panel visibility from the canonical authored tree */
export function seedPanelsFromDefault(): FlatPanel[] {
  return DEFAULT_FLAT.filter((p) => !NON_PERSISTED_PANELS.has(p.panel));
}

function findNode(nodes: PanelNode[], panel: SP): PanelNode | undefined {
  for (const n of nodes) {
    if (n.panel === panel) return n;
    if (n.children?.length) {
      const found = findNode(n.children, panel);
      if (found) return found;
    }
  }
  return undefined;
}

/** Flatten a single authored node (itself + descendants) — used for a
 * per-panel "reset just this radio panel's subtree" action. */
export function getDefaultPanelSubtree(panel: SP): FlatPanel[] {
  const found = findNode(defaultSpCoinPanelTree, panel);
  return found ? flattenPanelTree([found]) : [];
}
