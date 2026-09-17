// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListRow.tsx
// Portable version of the real app's TokenListItem.tsx/AccountListItem.tsx
// (2026-09-15) — the single row shape shared by all four "TOKEN META"-style
// ACTIVE_LIST_PANEL_MODES screens (REMOTE_TOKEN_LIST, REMOTE_ACCOUNT_AGENT_LIST,
// REMOTE_ACCOUNT_RECIPIENT_LIST, REMOTE_ACCOUNT_LIST). Every sizing value
// below (row height, padding, pill/icon/info-button dimensions) is copied
// from the real components' own doc comments, which record the same-day
// measurements this package was built to match — not re-guessed here.
// Placeholder in the same sense every other file in this package is:
// `onClick`/`onInfoClick` are plain optional callbacks, no real
// select/preview logic behind them.
'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssetListRow;
const jsx_runtime_1 = require("react/jsx-runtime");
const AssetSelectDropDown_1 = __importStar(require("./AssetSelectDropDown"));
const DEFAULT_INFO_ICON_SRC = '/assets/miscellaneous/info.png';
function AssetListRow({ icon, iconSrc, symbol, name, address, onSelect, onInfoClick, infoIconSrc = DEFAULT_INFO_ICON_SRC, badge, }) {
    const metaLabel = `${symbol || name || 'Asset'} Meta Data`;
    // 2026-09-16, on request ("find the icons like the web page finds them")
    // — resolved here, once, rather than requiring every caller (token list,
    // agent/recipient list, account list) to convert iconSrc itself the way
    // MeritWallet.tsx already has to for NetworkListRow's rows.
    const resolvedIcon = icon !== null && icon !== void 0 ? icon : (iconSrc ? ((0, jsx_runtime_1.jsx)("img", { src: iconSrc, alt: "", style: { width: '100%', height: '100%', objectFit: 'contain' } })) : undefined);
    return (
    // 2026-09-16, on request ("do this as well for every row, add 2px top
    // and bottom buffer") — scaled to match NetworkListRow.tsx's own
    // Rewards-table-derived compact scale (row ~22.5px, 14px icon, 10px
    // pill height, 9px pill font, 10px name/symbol, 9px chevron/copy/info
    // icon), same reasoning as that file's own comment: no exact
    // Rewards-table equivalent exists for icon/pill/info-button sizing
    // (that table has none), so these are the same proportional scale-down
    // NetworkListRow already uses, not a second independently-measured
    // value. paddingTop/Bottom: 2 is new — the compact scale had zero
    // vertical breathing room otherwise (a fixed-height box with content
    // centered edge-to-edge).
    (0, jsx_runtime_1.jsxs)("div", { style: {
            width: '100%',
            // 2026-09-16, corrected — same fix as NetworkListRow.tsx: the row
            // needs to genuinely grow 4px taller (2px top + 2px bottom), not
            // just gain inner padding within an unchanged maxHeight. 22.5 + 4
            // = 26.5.
            minHeight: 26.5,
            maxHeight: 26.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 5,
            paddingRight: 10,
            boxSizing: 'border-box',
        }, children: [(0, jsx_runtime_1.jsx)(AssetSelectDropDown_1.default, { icon: resolvedIcon, symbol: symbol, name: name, address: address !== null && address !== void 0 ? address : '', hasEntity: !!address, showDisplay: AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ICON |
                    AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDRESS |
                    AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.SYMBOL |
                    AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.NAME |
                    AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.COPY |
                    AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDR_COMP, addrPrePostSize: 4, onRowClick: onSelect, iconSizeClassName: "h-[17.5px] w-[17.5px]", pillHeightClassName: "h-[10px]", pillFontClassName: "text-[9px]", chevronSize: 9, copyIconSize: 9, nameLineClassName: "text-[10px] font-semibold leading-tight text-white", nameLineSuffix: badge }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onInfoClick, "aria-label": metaLabel, title: metaLabel, style: {
                    borderRadius: 4,
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    cursor: onInfoClick ? 'pointer' : 'default',
                    padding: 0,
                }, children: (0, jsx_runtime_1.jsx)("img", { src: infoIconSrc, alt: "Info", width: 11, height: 11, style: { height: 11, width: 11, objectFit: 'contain' } }) })] }));
}
