"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PANEL_ORDER = exports.defaultSpCoinPanelTree = exports.MUST_INCLUDE_ON_BOOT = exports.NON_PERSISTED_PANELS = void 0;
exports.flattenPanelTree = flattenPanelTree;
exports.seedPanelsFromDefault = seedPanelsFromDefault;
exports.getDefaultPanelSubtree = getDefaultPanelSubtree;
const spCoinDisplay_1 = require("./spCoinDisplay");
/* ─────────────────────────── helpers ─────────────────────────── */
const panelName = (panel) => { var _a; return (_a = spCoinDisplay_1.SP_COIN_DISPLAY[panel]) !== null && _a !== void 0 ? _a : String(panel); };
/**
 * Create a PanelNode with a derived `name` and optional children.
 * - `children` are only added if the array is non-empty.
 */
const node = (panel, visible, children) => ({
    panel,
    name: panelName(panel),
    visible,
    ...((children === null || children === void 0 ? void 0 : children.length) ? { children } : {}),
});
/* ──────────────── Single Source of Truth (SSoT) ───────────────── */
/** Panels that should NOT be persisted/seeded from the canonical tree. */
exports.NON_PERSISTED_PANELS = new Set([]);
exports.MUST_INCLUDE_ON_BOOT = [
    [spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_WALLET, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_RADIO_PANELS, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.PANEL_TITLE, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_HEADER_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TRADING_STATION_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.EXCHANGE_TRADING_PAIR, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SELL_SELECT_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.UNI_SELECT_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SWAP_ARROW_BUTTON, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_CONFIG_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.FEE_DISCLOSURE, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AFFILIATE_FEE, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_PANEL, false],
    // ASSET_PANELS: structural branch, always visible — same shape as
    // WALLET_RADIO_PANELS one level up (see its own enum doc comment).
    [spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_PANELS, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_META_DATA, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LOGO, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_INFO_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSORSHIP_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SEND_PANEL, false],
    // PROCESS_FLOW removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
    [spCoinDisplay_1.SP_COIN_DISPLAY.PASSWORD_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SEND_SELECT_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SEND_ADDRESS_HEADER_BAR, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SEND_BUTTON, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ADDRESS_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_LIST_PANEL, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_TOKEN_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_A_WALLET, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.CREATE_ACCOUNT, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SELL_TOKEN_SELECT_DROP_DOWN, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.BUY_TOKEN_SELECT_DROP_DOWN, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.UNI_TOKEN_SELECT_DROP_DOWN, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_EXCHANGE_TRADING_PAIR, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_SELECT_PANEL, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONNECT_TRADE_BUTTON, true],
    [spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_SPONSOR_LAB, false],
    [spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECTION_POPUP, false],
];
/** Canonical authored tree for the SponsorCoin UI. */
exports.defaultSpCoinPanelTree = [
    node(spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_WALLET, true, [
        node(spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_NETWORK_HEADER, true),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_ACCOUNT_HEADER, true, [node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, true), node(spCoinDisplay_1.SP_COIN_DISPLAY.ROLE_TABLE_COMPONENT, true)]),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_HEADER_PANEL, false, [node(spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN, false)]),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.PANEL_TITLE, true),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, true),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_RADIO_PANELS, true, [
            node(spCoinDisplay_1.SP_COIN_DISPLAY.TRADING_STATION_PANEL, true, [
                // 2026-09-25, corrected same day — CONNECT_TRADE_BUTTON nests
                // directly under ZERO_X_SELECT_PANEL (not CONFIG_SLIPPAGE_PANEL,
                // which defaults closed and hid it from the debug tree entirely
                // when it was nested there) and UNISWAP_TRADE_BUTTON nests under
                // UNI_SELECT_PANEL — each was a flat TRADING_STATION_PANEL
                // sibling of EXCHANGE_TRADING_PAIR before, mirroring each
                // button's real 1:1 pairing with its own quote panel in the
                // tree, not just visually in the UI.
                node(spCoinDisplay_1.SP_COIN_DISPLAY.CONFIG_SLIPPAGE_PANEL, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.EXCHANGE_TRADING_PAIR, true, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.SELL_SELECT_PANEL, true, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.SELL_TOKEN_SELECT_DROP_DOWN, true),
                    ]),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.SWAP_ARROW_BUTTON, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.ZERO_X_SELECT_PANEL, true, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.BUY_TOKEN_SELECT_DROP_DOWN, true),
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_TRADE_BUTTON, true),
                    ]),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.UNI_SELECT_PANEL, false, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.UNI_TOKEN_SELECT_DROP_DOWN, true),
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.UNISWAP_TRADE_BUTTON, false),
                    ]),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.FEE_DISCLOSURE, true),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.AFFILIATE_FEE, false),
            ]),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_LIST_SELECT_PANEL, false, [
                node(spCoinDisplay_1.SP_COIN_DISPLAY.ADDRESS_PANEL, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_LIST_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST, false, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.ADD_WALLET_ACCOUNT, false, [
                            node(spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_A_WALLET, false),
                            node(spCoinDisplay_1.SP_COIN_DISPLAY.IMPORT_AN_ACCOUNT, false),
                            node(spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_ACCOUNT, false),
                            node(spCoinDisplay_1.SP_COIN_DISPLAY.CONNECT_HARDWARE_WALLET, false),
                            node(spCoinDisplay_1.SP_COIN_DISPLAY.CREATE_ACCOUNT, false),
                        ]),
                    ]),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LIST, false),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_AGENT_LIST, false),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_SEND_LIST, false),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_ACCOUNT_RECIPIENT_LIST, false),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.REMOTE_TOKEN_LIST, false),
                ]),
            ]),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.MESSAGE_PANEL, false),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.MERIT_INFO_PANEL, false),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL, false, [node(spCoinDisplay_1.SP_COIN_DISPLAY.MANAGE_PENDING_REWARDS, false)]),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_STAKING_LIST, false),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LIST_REWARDS_PANEL, false, [
                node(spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_SPONSOR_REWARDS, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_RECIPIENT_REWARDS, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.PENDING_AGENT_REWARDS, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_SPONSORSHIPS, false),
            ]),
            // ASSET_PANELS: structural branch, always visible — same shape as
            // WALLET_RADIO_PANELS one level up.
            node(spCoinDisplay_1.SP_COIN_DISPLAY.ASSET_PANELS, true, [
                // ACCOUNT_PANEL: nested here (2026-09-09, on request) alongside
                // every other role/asset detail panel — was a flat WALLET_RADIO_PANELS
                // sibling of ASSET_PANELS itself.
                node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.AGENT_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_META_DATA, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LOGO, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_BUY_SWAP_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELL_SWAP_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_LOGO, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SEND_META_DATA, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_PANEL, false, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_META_DATA, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_LOGO, true),
                ]),
            ]),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.WALLET_CONFIG_PANEL, false),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSORSHIP_PANEL, false, [
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_SLIPPAGE_PANEL, false),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.STAKING_CONTROLLER_PANEL, true, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONFIG_PANEL, false),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_EXCHANGE_TRADING_PAIR, true, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_PANEL, true, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_SELECT_DROP_DOWN, true),
                    ]),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.RECIPIENT_SELECT_PANEL, true, [
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_TOKEN_SELECT_DROP_DOWN, false),
                        node(spCoinDisplay_1.SP_COIN_DISPLAY.STAKED_RECIPIENT_SELECT_DROP_DOWN, true),
                    ]),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_CONNECT_TRADE_BUTTON, true),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_FEE_DISCLOSURE, true),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SPONSOR_AFFILIATE_FEE, false),
            ]),
            node(spCoinDisplay_1.SP_COIN_DISPLAY.SEND_PANEL, false, [
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SEND_SELECT_PANEL, true),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SEND_ADDRESS_HEADER_BAR, true, [
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, true),
                    node(spCoinDisplay_1.SP_COIN_DISPLAY.ACTIVE_ACCOUNT_ADDRESS_EXPANDED, true),
                ]),
                node(spCoinDisplay_1.SP_COIN_DISPLAY.SEND_BUTTON, true),
            ]),
            // PROCESS_FLOW node removed 2026-09-24 -- retired panel id, see spCoinDisplay.ts.
            node(spCoinDisplay_1.SP_COIN_DISPLAY.PASSWORD_PANEL, false),
        ]),
        node(spCoinDisplay_1.SP_COIN_DISPLAY.CHEVRON_DOWN_OPEN_PENDING, false),
    ]),
    node(spCoinDisplay_1.SP_COIN_DISPLAY.NETWORK_SELECTION_POPUP, false),
    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_ACCESS_CONTROLLER, false),
    node(spCoinDisplay_1.SP_COIN_DISPLAY.TOKEN_LIST_OVERLAY_SPONSOR_LAB, false),
    node(spCoinDisplay_1.SP_COIN_DISPLAY.ACCOUNT_SELECTION_POPUP, false),
];
/** Single-pass flatten (iterative; no nested closures) */
function flattenPanelTree(nodes) {
    var _a;
    var _b;
    const out = [];
    const stack = [...nodes].reverse();
    while (stack.length) {
        const n = stack.pop();
        out.push({
            panel: n.panel,
            name: (_b = n.name) !== null && _b !== void 0 ? _b : panelName(n.panel),
            visible: !!n.visible,
        });
        if ((_a = n.children) === null || _a === void 0 ? void 0 : _a.length) {
            for (let i = n.children.length - 1; i >= 0; i--)
                stack.push(n.children[i]);
        }
    }
    return out;
}
/** Flatten once, reuse everywhere */
const DEFAULT_FLAT = flattenPanelTree(exports.defaultSpCoinPanelTree);
exports.DEFAULT_PANEL_ORDER = DEFAULT_FLAT.map((p) => p.panel);
/** Seed persisted panel visibility from the canonical authored tree */
function seedPanelsFromDefault() {
    return DEFAULT_FLAT.filter((p) => !exports.NON_PERSISTED_PANELS.has(p.panel));
}
function findNode(nodes, panel) {
    var _a;
    for (const n of nodes) {
        if (n.panel === panel)
            return n;
        if ((_a = n.children) === null || _a === void 0 ? void 0 : _a.length) {
            const found = findNode(n.children, panel);
            if (found)
                return found;
        }
    }
    return undefined;
}
/** Flatten a single authored node (itself + descendants) — used for a
 * per-panel "reset just this radio panel's subtree" action. */
function getDefaultPanelSubtree(panel) {
    const found = findNode(exports.defaultSpCoinPanelTree, panel);
    return found ? flattenPanelTree([found]) : [];
}
