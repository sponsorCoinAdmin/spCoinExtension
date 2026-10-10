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
import { jsx as _jsx } from "react/jsx-runtime";
import { dropDownStyle } from '@sponsorcoin/spcoin-common/styles';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
export default function NetworkSelectDropDown({ icon, label = 'Not Connected', onSelectClick, onIconClick, chevronUp = false, }) {
    return (_jsx(AssetSelectDropDown, { rootId: "WALLET_NETWORK_HEADER", hasEntity: true, icon: icon, 
        // Fed into the address slot (not symbol/name), same as the real
        // trigger-mode file — renders inside the solid pill together with
        // the icon, copy button, and chevron.
        address: label, copyLabel: "Copy network", showDisplay: ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            (chevronUp ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            ASSET_SELECT_DISPLAY.ADDR_COMP, onRowClick: onSelectClick, 
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
        onAddressClick: onSelectClick, onIconClick: onIconClick ? () => onIconClick() : undefined, iconSizeClassName: `h-[${dropDownStyle.header.iconSizePx}px] w-[${dropDownStyle.header.iconSizePx}px]`, pillHeightClassName: `h-[${dropDownStyle.header.pillHeightPx}px]`, pillFontClassName: `text-[${dropDownStyle.header.fontSizePx}px]`, chevronSize: dropDownStyle.header.chevronSizePx, copyIconSize: dropDownStyle.header.copyIconSizePx }));
}
