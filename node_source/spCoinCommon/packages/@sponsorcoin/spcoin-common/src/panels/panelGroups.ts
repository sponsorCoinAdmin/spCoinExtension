// File: spCoinCommon/src/panels/panelGroups.ts
//
// Copied from lib/structure/exchangeContext/constants/spCoinDisplay.ts
// in the parent app repo (2026-09-06, build plan step 3 — see
// docs/design/spcoinPackagesDesign.md §4 there). Renamed from
// `spCoinDisplay.ts` to `panelGroups.ts` in this package only, to avoid
// two same-named files in one small source tree — this file's actual
// export names (MAIN_RADIO_OVERLAY_PANELS, RADIO_PANEL_GROUPS, etc.)
// are unchanged.

import { SP_COIN_DISPLAY as SP } from './spCoinDisplay';

/**
 * Main overlay radio members.
 * This list is used for "global overlay radio" and stack gating.
 *
 * IMPORTANT:
 * - These are mutually exclusive overlays (radio behavior).
 * - Do NOT put child-mode panels here (ex: AGENTS, RECIPIENTS, SPONSORS).
 */
export const MAIN_RADIO_OVERLAY_PANELS = [
  SP.TRADING_STATION_PANEL,
  SP.ASSET_LIST_SELECT_PANEL,
  SP.MESSAGE_PANEL,
  SP.MANAGE_SPONSORSHIPS_PANEL,
  SP.SPONSOR_STAKING_LIST,
  SP.ACCOUNT_LIST_REWARDS_PANEL,
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
  SP.MERIT_INFO_PANEL,
  SP.WALLET_CONFIG_PANEL,
  SP.SPONSORSHIP_PANEL,
  SP.SEND_PANEL,
  // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
  SP.PASSWORD_PANEL,
] as const satisfies readonly SP[];

/**
 * Nested manage-scoped radio members (old model).
 * Now empty because the legacy container and nested radio behavior were removed.
 */
export const MANAGE_SCOPED = [] as const satisfies readonly SP[];

// RETIRED (2026-09-08, same-day follow-up) — this group used to be
// "ACCOUNT_PANEL children: exactly 0 or 1 visible", first losing
// AGENT_ACCOUNT to its own dedicated AGENT_PANEL, then — same day — losing
// its remaining 3 members (ACTIVE_ACCOUNT/SPONSOR_ACCOUNT/RECIPIENT_ACCOUNT)
// the same way: ACCOUNT_PANEL is now repurposed to mean "the active
// account's own dedicated view" (it has no other sub-mode left to share
// with), and SPONSOR_PANEL/RECIPIENT_PANEL are new
// MAIN_RADIO_OVERLAY_PANELS members in their own right (see above). Kept
// exported as an empty array (not deleted) so nothing importing it breaks
// — RADIO_PANEL_GROUPS below still lists it, inert, rather than needing
// every consumer to also drop the group entry. ACTIVE_ACCOUNT (48)/
// SPONSOR_ACCOUNT (18)/RECIPIENT_ACCOUNT (19) are unchanged and still used
// elsewhere as plain role identifiers (AccountAvatar's `mode` prop,
// getAccountRoleLabel) — only their former use as ACCOUNT_PANEL visibility
// sub-flags is gone.
export const ACCOUNT_PANEL_MODES = [] as const satisfies readonly SP[];

// ACCOUNT_LIST_REWARDS_PANEL children: exactly 0 or 1 visible.
export const REWARDS_GROUP_MODES = [
  SP.ACTIVE_SPONSORSHIPS,
  SP.PENDING_SPONSOR_REWARDS,
  SP.PENDING_RECIPIENT_REWARDS,
  SP.PENDING_AGENT_REWARDS,
] as const satisfies readonly SP[];

// RECIPIENT_SELECT_PANEL children: exactly 0 or 1 visible (same on-screen dropdown slot).
export const STAKED_SP_COIN_PANEL_MODES = [
  SP.STAKED_TOKEN_SELECT_DROP_DOWN,
  SP.STAKED_RECIPIENT_SELECT_DROP_DOWN,
] as const satisfies readonly SP[];

// ACTIVE_LIST_PANEL's content-kind children: exactly 0 or 1 visible.
export const ACTIVE_LIST_PANEL_MODES = [
  SP.REMOTE_TOKEN_LIST,
  SP.REMOTE_ACCOUNT_AGENT_LIST,
  SP.REMOTE_ACCOUNT_RECIPIENT_LIST,
  SP.REMOTE_ACCOUNT_SEND_LIST,
  SP.NETWORK_LIST,
  SP.LOCAL_ACCOUNT_WALLET_LIST,
] as const satisfies readonly SP[];

// ADD_WALLET_ACCOUNT's destination pages: exactly 0 or 1 visible.
export const ADD_WALLET_ACCOUNT_MODES = [
  SP.IMPORT_A_WALLET,
  SP.IMPORT_AN_ACCOUNT,
  SP.CONNECT_ACCOUNT,
  SP.CONNECT_HARDWARE_WALLET,
  SP.CREATE_ACCOUNT,
] as const satisfies readonly SP[];

export const RADIO_PANEL_GROUPS = [
  { name: 'MAIN_RADIO_OVERLAY_PANELS', members: MAIN_RADIO_OVERLAY_PANELS },
  { name: 'ACCOUNT_PANEL_MODES', members: ACCOUNT_PANEL_MODES },
  { name: 'REWARDS_GROUP_MODES', members: REWARDS_GROUP_MODES },
  { name: 'STAKED_SP_COIN_PANEL_MODES', members: STAKED_SP_COIN_PANEL_MODES },
  { name: 'ACTIVE_LIST_PANEL_MODES', members: ACTIVE_LIST_PANEL_MODES },
  { name: 'ADD_WALLET_ACCOUNT_MODES', members: ADD_WALLET_ACCOUNT_MODES },
] as const;

/**
 * Stack components — panels that get their own frame on the global
 * displayStack (pushed by openPanel, popped by closePanel's pop-top
 * overload). Mostly the main overlays, plus ADD_WALLET_ACCOUNT and its
 * 5 destination pages.
 */
export const STACK_COMPONENTS = [
  ...MAIN_RADIO_OVERLAY_PANELS,
  SP.ADD_WALLET_ACCOUNT,
  ...ADD_WALLET_ACCOUNT_MODES,
] as const satisfies readonly SP[];

/**
 * Fast membership checks (action-model helpers).
 *
 * CRITICAL: membership checks elsewhere use Number(panel), so these
 * sets MUST be numeric to avoid enum-instance / import-path mismatches.
 */
export const IS_MAIN_RADIO_OVERLAY_PANEL: ReadonlySet<number> = new Set(
  MAIN_RADIO_OVERLAY_PANELS.map(Number),
);
export const IS_MANAGE_SCOPED: ReadonlySet<number> = new Set(
  MANAGE_SCOPED.map(Number),
);
export const IS_STACK_COMPONENT: ReadonlySet<number> = new Set(
  STACK_COMPONENTS.map(Number),
);

/** Dev-only guard against accidental duplicates */
if (process.env.NODE_ENV !== 'production') {
  const checkUnique = (label: string, arr: readonly SP[]) => {
    const s = new Set<number>();
    for (const v of arr) {
      const id = Number(v);
      if (s.has(id)) {
        // eslint-disable-next-line no-console
        console.error(`[panelGroups] Duplicate in ${label}:`, v, SP[v]);
        throw new Error(
          `[panelGroups] Duplicate in ${label}: ${String(v)} (${SP[v]})`,
        );
      }
      s.add(id);
    }
  };

  checkUnique('MAIN_RADIO_OVERLAY_PANELS', MAIN_RADIO_OVERLAY_PANELS);
  checkUnique('MANAGE_SCOPED', MANAGE_SCOPED);
  checkUnique('STACK_COMPONENTS', STACK_COMPONENTS);
}
