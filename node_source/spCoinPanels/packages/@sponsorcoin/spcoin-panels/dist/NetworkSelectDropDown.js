// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkSelectDropDown.tsx
// Portable placeholder for the network-selector pill WalletHeader's own
// leftSlot carries in the real app (components/views/MeritWalletComponent.tsx
// — WALLET_NETWORK_HEADER's actual content IS WalletHeader with this pill
// as leftSlot, not a separate row; see extensionPlan.md/handoff notes).
// Same reasoning as WalletAccountHeader.tsx: the real
// components/views/Buttons/Connect/NetworkSelectDropDown.tsx reads wagmi's
// useAccount/useChainId, ExchangeContext's useAppChainId, a real network
// list, and opens a real NETWORK_PANEL — none of which exist yet in a
// consumer with no wallet/chain connection at all. Inert placeholder.
//
// 2026-09-16, on request ("the AccountSelectDropDown should be like the
// NetworkSelectDropDown in the grey header bar") — while fixing that,
// found THIS file was itself stale: it hand-rolled its own pill (a
// translucent-white rgba(255,255,255,0.14) rounded box) from before the
// real app's own 2026-09-15 change ("use that bgColor in all dropDown
// Addresses... this should be the default for all selectDropDowns
// everywhere") dropped that exact translucent/frosted look app-wide in
// favor of one solid `bg-[#243056]` ADDR_COMP pill — see the real
// components/views/Buttons/Connect/NetworkSelectDropDown.tsx's own
// matching 2026-09-15 comment. Rewritten to delegate to this package's
// own AssetSelectDropDown (same component the real trigger-mode file
// already uses) instead of duplicating a now-outdated look by hand —
// gets the solid pill, a real copy button, and the same chevron
// behavior for free, and can't drift out of sync with it again the same
// way.
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
exports.default = NetworkSelectDropDown;
const jsx_runtime_1 = require("react/jsx-runtime");
const AssetSelectDropDown_1 = __importStar(require("./AssetSelectDropDown"));
function NetworkSelectDropDown({ icon, label = 'Not Connected', onSelectClick, onIconClick, chevronUp = false, }) {
    return ((0, jsx_runtime_1.jsx)(AssetSelectDropDown_1.default, { rootId: "WALLET_NETWORK_HEADER", hasEntity: true, icon: icon, 
        // Fed into the address slot (not symbol/name), same as the real
        // trigger-mode file — renders inside the solid pill together with
        // the icon, copy button, and chevron.
        address: label, copyLabel: "Copy network", showDisplay: AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ICON |
            AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDRESS |
            AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.COPY |
            (chevronUp ? AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.CHEVRON_UP : AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDR_COMP, onRowClick: onSelectClick, 
        // 2026-09-16, on live report ("the select dropdown ... is so
        // different, why?") — root cause: the "address" slot here holds the
        // trigger LABEL (e.g. "HardHat"), not a real address to truncate.
        // AssetSelectDropDown's own address span always calls
        // e.stopPropagation() on click (see its handleAddressClick) — with
        // no onAddressClick and no addrPrePostSize (canToggleAddress false),
        // that click became a genuine no-op instead of falling through to
        // onRowClick, so clicking the label text (the majority of this
        // pill's visible area) silently did nothing. Passing the same
        // handler here — there's nothing real to toggle in this slot, so
        // clicking it should just open the picker like the rest of the pill.
        onAddressClick: onSelectClick, onIconClick: onIconClick ? () => onIconClick() : undefined, iconSizeClassName: "h-[18px] w-[18px]", pillHeightClassName: "h-[16px]", pillFontClassName: "text-[10px]", chevronSize: 11, copyIconSize: 11 }));
}
