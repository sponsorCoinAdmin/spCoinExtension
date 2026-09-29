"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSpCoinPanelTree = exports.KINDS = exports.PARENT_OF = exports.CHILDREN = exports.PANEL_BY_ID = exports.ROOTS = exports.NON_INDEXED_PANELS = exports.IS_STACK_COMPONENT = exports.IS_MANAGE_SCOPED = exports.IS_MAIN_RADIO_OVERLAY_PANEL = exports.STACK_COMPONENTS = exports.MANAGE_SCOPED = exports.MAIN_RADIO_OVERLAY_PANELS = exports.PANEL_DEFS = void 0;
var spCoinDisplay_1 = require("./spCoinDisplay");
var panelGroups_1 = require("./panelGroups");
Object.defineProperty(exports, "IS_MAIN_RADIO_OVERLAY_PANEL", { enumerable: true, get: function () { return panelGroups_1.IS_MAIN_RADIO_OVERLAY_PANEL; } });
Object.defineProperty(exports, "IS_MANAGE_SCOPED", { enumerable: true, get: function () { return panelGroups_1.IS_MANAGE_SCOPED; } });
Object.defineProperty(exports, "IS_STACK_COMPONENT", { enumerable: true, get: function () { return panelGroups_1.IS_STACK_COMPONENT; } });
/* ─────────────────────────────── Grouping Helpers ─────────────────────────────── */
var EXCHANGE_TRADING_PAIR_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.SELL_SELECT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SWAP_ARROW_BUTTON,
    spCoinDisplay_1.SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.UNI_SELECT_PANEL,
];
// 2026-09-25, on request — CONNECT_TRADE_BUTTON/UNISWAP_TRADE_BUTTON no
// longer listed here as flat TRADING_STATION_PANEL siblings; each now
// nests under its own quote panel instead (CONFIG_SLIPPAGE_PANEL /
// UNI_SELECT_PANEL respectively — see those defs' own `children` below).
var TRADING_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.EXCHANGE_TRADING_PAIR,
    spCoinDisplay_1.SP_COIN_DISPLAY.FEE_DISCLOSURE,
    spCoinDisplay_1.SP_COIN_DISPLAY.AFFILIATE_FEE,
];
var SPONSOR_EXCHANGE_TRADING_PAIR_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_SELECT_PANEL,
];
var SPONSOR_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_SLIPPAGE_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.STAKING_CONTROLLER_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_EXCHANGE_TRADING_PAIR,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONNECT_TRADE_BUTTON,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_FEE_DISCLOSURE,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_AFFILIATE_FEE,
];
var ACCOUNT_LIST_REWARDS_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_AGENT_REWARDS,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS,
];
// 2026-09-08, two same-day rounds — AGENT_ACCOUNT removed first (its own
// AGENT_PANEL), then SPONSOR_ACCOUNT/RECIPIENT_ACCOUNT the same way
// (SPONSOR_PANEL/RECIPIENT_PANEL, see MAIN_RADIO_OVERLAY_PANELS in
// panelGroups.ts) — ACCOUNT_PANEL is now repurposed as ACTIVE_ACCOUNT's own
// dedicated view, with no sub-mode left to resolve at all.
var ACCOUNT_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_META_DATA,
];
// 2026-09-08, same-day follow-up (on request) — AGENT_PANEL/
// SPONSOR_PANEL/RECIPIENT_PANEL each get their own LOGO/META_DATA
// children now, the same shape ACCOUNT_PANEL/TOKEN_PANEL/NETWORK_PANEL
// already have, instead of reusing ACCOUNT_LOGO/ACCOUNT_META_DATA (which
// would give those two ids two parents at once — PARENT_OF only tracks
// one). AccountPanelContent.tsx picks the right pair off its `mode` prop.
var AGENT_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_META_DATA,
];
var SPONSOR_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_META_DATA,
];
var RECIPIENT_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_META_DATA,
];
var ASSET_LIST_SELECT_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ADDRESS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_LIST_PANEL,
];
var TOKEN_CONTRACT_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_META_DATA,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LOGO,
];
var NETWORK_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_META_DATA,
    spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LOGO,
];
// 2026-09-08, same-day follow-up (on request) — one LOGO/META_DATA pair
// per activeTokens.* shadow slot, same shape as TOKEN_CONTRACT_PANEL_CHILDREN
// above. See TOKEN_BUY_PANEL's own enum doc comment for which slot each
// panel reads.
var TOKEN_BUY_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_META_DATA,
];
var TOKEN_SELL_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_META_DATA,
];
var TOKEN_BUY_SWAP_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_META_DATA,
];
var TOKEN_SELL_SWAP_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_META_DATA,
];
// 2026-09-09, on request — the Send tab's own token (tradeData.
// sendTokenContract), same LOGO/META_DATA shape as the 4 above.
var TOKEN_SEND_PANEL_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_LOGO,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_META_DATA,
];
var PENDING_SPONSOR_CHILDREN = [];
var PENDING_RECIPIENT_CHILDREN = [];
var PENDING_AGENT_CHILDREN = [];
var UNSPONSOR_CHILDREN = [];
// 2026-09-08, on request — pure structural grouping under WALLET_RADIO_PANELS:
// the "pick an asset/party to view" detail panels nest here instead of
// being flat WALLET_RADIO_PANELS siblings. ACCOUNT_PANEL joined this group
// (2026-09-09, on request) — was a flat TRADE_HEADER_CHILDREN sibling of
// ASSET_PANELS itself, now nests inside it like every other role/asset
// detail panel. Each keeps its own existing MAIN_RADIO_OVERLAY_PANELS
// membership unchanged (this only changes display-tree nesting/PARENT_OF,
// not radio-exclusivity behavior).
var ASSET_PANELS_CHILDREN = [
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
];
var TRADE_HEADER_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.TRADING_STATION_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MESSAGE_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_STAKING_LIST,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_PANELS,
    spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_INFO_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_CONFIG_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SPONSORSHIP_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.SEND_PANEL,
    // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts's
    // own retirement note. Never actually opened via this radio group since
    // 2026-08-27 (MeritApprovalOrchestrator.tsx stopped navigating to it).
    spCoinDisplay_1.SP_COIN_DISPLAY.PASSWORD_PANEL,
];
var RADIO_PANELS_CHILDREN = __spreadArray([], TRADE_HEADER_CHILDREN, true);
var MENU_TAB_HEADER_BAR_CHILDREN = [];
var PANEL_TITLE_CHILDREN = [];
var MERIT_WALLET_CHILDREN = [
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER,
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_HEADER_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.PANEL_TITLE,
    spCoinDisplay_1.SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_RADIO_PANELS,
    spCoinDisplay_1.SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING,
];
/* ─────────────────────────────── Panel Definitions ─────────────────────────────── */
/** Helper to auto-set overlay flag from action-model set. */
var def = function (d) { return (__assign(__assign({}, d), (panelGroups_1.IS_MAIN_RADIO_OVERLAY_PANEL.has(Number(d.id)) ? { overlay: true } : null))); };
exports.PANEL_DEFS = [
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_WALLET, kind: 'root', defaultVisible: true, children: MERIT_WALLET_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TRADING_STATION_PANEL, kind: 'root', defaultVisible: true, children: TRADING_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, kind: 'panel', defaultVisible: true, children: MENU_TAB_HEADER_BAR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER, kind: 'panel', defaultVisible: true, children: [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, spCoinDisplay_1.SP_COIN_DISPLAY.ROLE_TABLE_COMPONENT] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_RADIO_PANELS, kind: 'panel', defaultVisible: true, children: RADIO_PANELS_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.PANEL_TITLE, kind: 'panel', defaultVisible: true, children: PANEL_TITLE_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ROLE_TABLE_COMPONENT, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_HEADER_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, kind: 'list', children: ASSET_LIST_SELECT_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ADDRESS_PANEL, kind: 'panel', defaultVisible: false, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_LIST_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LIST, spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST, spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST, spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST, spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_TOKEN_LIST] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_TOKEN_LIST, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LIST, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, kind: 'flag', children: [spCoinDisplay_1.SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT, kind: 'panel', children: [spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_A_WALLET, spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT, spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_ACCOUNT, spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET, spCoinDisplay_1.SP_COIN_DISPLAY.CREATE_ACCOUNT] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_A_WALLET, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CREATE_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MESSAGE_PANEL, kind: 'panel' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL, kind: 'panel', children: [spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS, kind: 'panel' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_STAKING_LIST, kind: 'panel', children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL, kind: 'panel', children: ACCOUNT_LIST_REWARDS_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS, kind: 'panel', children: PENDING_SPONSOR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS, kind: 'panel', children: PENDING_RECIPIENT_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_AGENT_REWARDS, kind: 'panel', children: PENDING_AGENT_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS, kind: 'panel', children: UNSPONSOR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_ACCOUNT, kind: 'flag' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_RECIPIENT_SELECT_DROP_DOWN, kind: 'control', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SELL_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.BUY_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.UNI_TOKEN_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_SELECT_DROP_DOWN, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_META_DATA, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LOGO, kind: 'panel', defaultVisible: true, children: [] }),
    // 2026-09-08, on request — pure grouping BRANCH for the "pick an
    // asset/party to view" panels below (see ASSET_PANELS_CHILDREN above and
    // its own enum doc comment), same shape as WALLET_RADIO_PANELS one level up:
    // defaultVisible:true (structural, always on — not something a user
    // opens/closes) and not itself a MAIN_RADIO_OVERLAY_PANELS member. Its
    // children keep their own independent radio-exclusivity membership
    // completely unchanged; this is display-tree organization only.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_PANELS, kind: 'panel', defaultVisible: true, children: ASSET_PANELS_CHILDREN }),
    // Active/connected account's own view — nested under ASSET_PANELS
    // (2026-09-09, on request) alongside every other role/asset detail panel,
    // instead of sitting as a flat TRADE_HEADER_CHILDREN sibling of it.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_PANEL, kind: 'panel', children: ACCOUNT_PANEL_CHILDREN }),
    // Dedicated agent-account view, with its own LOGO/META_DATA children
    // (AGENT_PANEL_CHILDREN above) — same shape as ACCOUNT_PANEL/TOKEN_PANEL/
    // NETWORK_PANEL, each toggled independently of the other 3 role panels.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_PANEL, kind: 'panel', children: AGENT_PANEL_CHILDREN }),
    // The other 2 roles that used to share ACCOUNT_PANEL, given the same
    // treatment as AGENT_PANEL above.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_PANEL, kind: 'panel', children: SPONSOR_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_PANEL, kind: 'panel', children: RECIPIENT_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_PANEL, kind: 'panel', children: TOKEN_CONTRACT_PANEL_CHILDREN }),
    // Dedicated buy/sell token detail views — see TOKEN_BUY_PANEL's own enum
    // doc comment for which activeTokens.* slot each one reads.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_PANEL, kind: 'panel', children: TOKEN_BUY_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_PANEL, kind: 'panel', children: TOKEN_SELL_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL, kind: 'panel', children: TOKEN_BUY_SWAP_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL, kind: 'panel', children: TOKEN_SELL_SWAP_PANEL_CHILDREN }),
    // Send tab's own token detail view — reads tradeData.sendTokenContract
    // directly, its own dedicated field (not a swap*/sponsor* shadow pair).
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_PANEL, kind: 'panel', children: TOKEN_SEND_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_PANEL, kind: 'panel', children: NETWORK_PANEL_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_INFO_PANEL, kind: 'panel' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.EXCHANGE_TRADING_PAIR, kind: 'panel', defaultVisible: true, children: EXCHANGE_TRADING_PAIR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SELL_SELECT_PANEL, kind: 'panel', defaultVisible: true, children: [spCoinDisplay_1.SP_COIN_DISPLAY.SELL_TOKEN_SELECT_DROP_DOWN] }),
    // 2026-09-25, corrected same day — CONNECT_TRADE_BUTTON nests directly
    // under ZERO_X_SELECT_PANEL (not CONFIG_SLIPPAGE_PANEL, which defaults
    // closed and hid it from this tree entirely when it was nested there).
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL, kind: 'panel', defaultVisible: true, children: [spCoinDisplay_1.SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, spCoinDisplay_1.SP_COIN_DISPLAY.BUY_TOKEN_SELECT_DROP_DOWN, spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.UNI_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.UNI_TOKEN_SELECT_DROP_DOWN, spCoinDisplay_1.SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, kind: 'panel', defaultVisible: true, children: [] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, kind: 'panel' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SWAP_ARROW_BUTTON, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON, kind: 'control', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON, kind: 'control', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_CONFIG_PANEL, kind: 'control', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSORSHIP_PANEL, kind: 'panel', defaultVisible: false, children: SPONSOR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_SLIPPAGE_PANEL, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_EXCHANGE_TRADING_PAIR, kind: 'panel', defaultVisible: false, children: SPONSOR_EXCHANGE_TRADING_PAIR_CHILDREN }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELECT_DROP_DOWN] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_SELECT_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_DROP_DOWN, spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_RECIPIENT_SELECT_DROP_DOWN] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.STAKING_CONTROLLER_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONFIG_PANEL] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONFIG_PANEL, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONNECT_TRADE_BUTTON, kind: 'control', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_FEE_DISCLOSURE, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_AFFILIATE_FEE, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_PANEL, kind: 'panel', defaultVisible: false, children: [spCoinDisplay_1.SP_COIN_DISPLAY.SEND_SELECT_PANEL, spCoinDisplay_1.SP_COIN_DISPLAY.SEND_ADDRESS_HEADER_BAR, spCoinDisplay_1.SP_COIN_DISPLAY.SEND_BUTTON] }),
    // PROCESS_FLOW def removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.PASSWORD_PANEL, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_BUTTON, kind: 'button', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_TITLE, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_ADDRESS_HEADER_BAR, kind: 'panel', defaultVisible: true, children: [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED] }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_ADDRESS_COMPONENT, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_TO_ADDRESS, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.SEND_SELECT_PANEL, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.FEE_DISCLOSURE, kind: 'panel', defaultVisible: true }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.AFFILIATE_FEE, kind: 'panel' }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_SPONSOR_LAB, kind: 'panel', defaultVisible: false }),
    def({ id: spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECTION_POPUP, kind: 'panel', defaultVisible: false }),
];
/* ─────────────────────────────── Derived Helpers ─────────────────────────────── */
exports.MAIN_RADIO_OVERLAY_PANELS = panelGroups_1.MAIN_RADIO_OVERLAY_PANELS;
exports.MANAGE_SCOPED = panelGroups_1.MANAGE_SCOPED;
exports.STACK_COMPONENTS = panelGroups_1.STACK_COMPONENTS;
exports.NON_INDEXED_PANELS = new Set([
    spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_WALLET,
    spCoinDisplay_1.SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_RADIO_PANELS,
    spCoinDisplay_1.SP_COIN_DISPLAY.PANEL_TITLE,
    spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER,
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_HEADER_PANEL,
    spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN,
    spCoinDisplay_1.SP_COIN_DISPLAY.SEND_TITLE,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_ADDRESS_COMPONENT,
    spCoinDisplay_1.SP_COIN_DISPLAY.SEND_SELECT_PANEL,
]);
exports.ROOTS = [
    spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_WALLET,
    spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER,
    spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_SPONSOR_LAB,
    spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECTION_POPUP,
];
/** Fast id → definition lookup */
exports.PANEL_BY_ID = (function () {
    var m = new Map();
    for (var _i = 0, PANEL_DEFS_2 = exports.PANEL_DEFS; _i < PANEL_DEFS_2.length; _i++) {
        var d = PANEL_DEFS_2[_i];
        m.set(d.id, d);
    }
    return m;
})();
/** parent → children (from defs that declare children) */
exports.CHILDREN = (function () {
    var _a;
    var acc = {};
    for (var _i = 0, PANEL_DEFS_3 = exports.PANEL_DEFS; _i < PANEL_DEFS_3.length; _i++) {
        var d = PANEL_DEFS_3[_i];
        if ((_a = d.children) === null || _a === void 0 ? void 0 : _a.length)
            acc[d.id] = d.children;
    }
    return acc;
})();
/** child → parent (inverse of CHILDREN) */
exports.PARENT_OF = (function () {
    var acc = {};
    for (var _i = 0, _a = Object.entries(exports.CHILDREN); _i < _a.length; _i++) {
        var _b = _a[_i], parentIdStr = _b[0], children = _b[1];
        var parentId = Number(parentIdStr);
        for (var _c = 0, _d = children !== null && children !== void 0 ? children : []; _c < _d.length; _c++) {
            var child = _d[_c];
            acc[child] = parentId;
        }
    }
    return acc;
})();
/** id → kind */
exports.KINDS = (function () {
    var acc = {};
    for (var _i = 0, PANEL_DEFS_4 = exports.PANEL_DEFS; _i < PANEL_DEFS_4.length; _i++) {
        var d = PANEL_DEFS_4[_i];
        acc[d.id] = d.kind;
    }
    return acc;
})();
/** Dev-only guard: enforce unique ids in PANEL_DEFS */
if (process.env.NODE_ENV !== 'production') {
    var seen = new Set();
    for (var _i = 0, PANEL_DEFS_1 = exports.PANEL_DEFS; _i < PANEL_DEFS_1.length; _i++) {
        var d = PANEL_DEFS_1[_i];
        if (seen.has(d.id)) {
            // eslint-disable-next-line no-console
            console.error('[panelRegistry] Duplicate PANEL_DEFS id:', d.id, d);
            throw new Error("[panelRegistry] Duplicate PANEL_DEFS id: ".concat(String(d.id)));
        }
        seen.add(d.id);
    }
}
var defaultPanelTree_1 = require("./defaultPanelTree");
Object.defineProperty(exports, "defaultSpCoinPanelTree", { enumerable: true, get: function () { return defaultPanelTree_1.defaultSpCoinPanelTree; } });
