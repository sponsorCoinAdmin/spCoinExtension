"use strict";
// File: spCoinCommon/src/panels/panelGroups.ts
//
// Copied from lib/structure/exchangeContext/constants/spCoinDisplay.ts
// in the parent app repo (2026-09-06, build plan step 3 — see
// docs/design/spcoinPackagesDesign.md §4 there). Renamed from
// `spCoinDisplay.ts` to `panelGroups.ts` in this package only, to avoid
// two same-named files in one small source tree — this file's actual
// export names (MAIN_RADIO_OVERLAY_PANELS, RADIO_PANEL_GROUPS, etc.)
// are unchanged.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_STACK_COMPONENT = exports.IS_MANAGE_SCOPED = exports.IS_MAIN_RADIO_OVERLAY_PANEL = exports.STACK_COMPONENTS = exports.RADIO_PANEL_GROUPS = exports.ADD_WALLET_ACCOUNT_MODES = exports.ACTIVE_LIST_PANEL_MODES = exports.STAKED_SP_COIN_PANEL_MODES = exports.REWARDS_GROUP_MODES = exports.ACCOUNT_PANEL_MODES = exports.MANAGE_SCOPED = exports.MAIN_RADIO_OVERLAY_PANELS = void 0;
const spCoinDisplay_1 = require("./spCoinDisplay");
/**
 * Main overlay radio members.
 * This list is used for "global overlay radio" and stack gating.
 *
 * IMPORTANT:
 * - These are mutually exclusive overlays (radio behavior).
 * - Do NOT put child-mode panels here (ex: AGENTS, RECIPIENTS, SPONSORS).
 */
exports.MAIN_RADIO_OVERLAY_PANELS = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TRADING_STATION_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MESSAGE_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_STAKING_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_INFO_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_CONFIG_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSORSHIP_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SEND_PANEL,
    // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
    spCoinDisplay_1.SP_COIN_DISPLAY.PASSWORD_PANEL,
];
/**
 * Nested manage-scoped radio members (old model).
 * Now empty because the legacy container and nested radio behavior were removed.
 */
exports.MANAGE_SCOPED = [];
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
exports.ACCOUNT_PANEL_MODES = [];
// ACCOUNT_LIST_REWARDS_PANEL children: exactly 0 or 1 visible.
exports.REWARDS_GROUP_MODES = [
    spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_AGENT_REWARDS,
];
// RECIPIENT_SELECT_PANEL children: exactly 0 or 1 visible (same on-screen dropdown slot).
exports.STAKED_SP_COIN_PANEL_MODES = [
    spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_DROP_DOWN,
    spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_RECIPIENT_SELECT_DROP_DOWN,
];
// ACTIVE_LIST_PANEL's content-kind children: exactly 0 or 1 visible.
exports.ACTIVE_LIST_PANEL_MODES = [
    spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_TOKEN_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST,
];
// ADD_WALLET_ACCOUNT's destination pages: exactly 0 or 1 visible.
exports.ADD_WALLET_ACCOUNT_MODES = [
    spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_A_WALLET,
    spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT,
    spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_ACCOUNT,
    spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET,
    spCoinDisplay_1.SP_COIN_DISPLAY.CREATE_ACCOUNT,
];
exports.RADIO_PANEL_GROUPS = [
    { name: 'MAIN_RADIO_OVERLAY_PANELS', members: exports.MAIN_RADIO_OVERLAY_PANELS },
    { name: 'ACCOUNT_PANEL_MODES', members: exports.ACCOUNT_PANEL_MODES },
    { name: 'REWARDS_GROUP_MODES', members: exports.REWARDS_GROUP_MODES },
    { name: 'STAKED_SP_COIN_PANEL_MODES', members: exports.STAKED_SP_COIN_PANEL_MODES },
    { name: 'ACTIVE_LIST_PANEL_MODES', members: exports.ACTIVE_LIST_PANEL_MODES },
    { name: 'ADD_WALLET_ACCOUNT_MODES', members: exports.ADD_WALLET_ACCOUNT_MODES },
];
/**
 * Stack components — panels that get their own frame on the global
 * displayStack (pushed by openPanel, popped by closePanel's pop-top
 * overload). Mostly the main overlays, plus ADD_WALLET_ACCOUNT and its
 * 5 destination pages.
 */
exports.STACK_COMPONENTS = [
    ...exports.MAIN_RADIO_OVERLAY_PANELS,
    spCoinDisplay_1.SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT,
    ...exports.ADD_WALLET_ACCOUNT_MODES,
];
/**
 * Fast membership checks (action-model helpers).
 *
 * CRITICAL: membership checks elsewhere use Number(panel), so these
 * sets MUST be numeric to avoid enum-instance / import-path mismatches.
 */
exports.IS_MAIN_RADIO_OVERLAY_PANEL = new Set(exports.MAIN_RADIO_OVERLAY_PANELS.map(Number));
exports.IS_MANAGE_SCOPED = new Set(exports.MANAGE_SCOPED.map(Number));
exports.IS_STACK_COMPONENT = new Set(exports.STACK_COMPONENTS.map(Number));
/** Dev-only guard against accidental duplicates */
if (process.env.NODE_ENV !== 'production') {
    const checkUnique = (label, arr) => {
        const s = new Set();
        for (const v of arr) {
            const id = Number(v);
            if (s.has(id)) {
                // eslint-disable-next-line no-console
                console.error(`[panelGroups] Duplicate in ${label}:`, v, spCoinDisplay_1.SP_COIN_DISPLAY[v]);
                throw new Error(`[panelGroups] Duplicate in ${label}: ${String(v)} (${spCoinDisplay_1.SP_COIN_DISPLAY[v]})`);
            }
            s.add(id);
        }
    };
    checkUnique('MAIN_RADIO_OVERLAY_PANELS', exports.MAIN_RADIO_OVERLAY_PANELS);
    checkUnique('MANAGE_SCOPED', exports.MANAGE_SCOPED);
    checkUnique('STACK_COMPONENTS', exports.STACK_COMPONENTS);
}
