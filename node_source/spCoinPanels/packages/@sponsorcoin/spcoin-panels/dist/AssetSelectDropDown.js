// File: node_source/spCoinPanels/AssetSelectDropDowns/AssetSelectDropDown.tsx
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_SELECT_DISPLAY = void 0;
exports.default = AssetSelectDropDown;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
// Inlined (2026-09-11, portability pass) rather than imported from the
// app-internal '@/lib/utils/addressUtils' (doesn't resolve outside this
// app's own build). @sponsorcoin/spcoin-lib@1.0.4 now has the same
// function published — tried switching to it during the 2026-09-11
// cleanup pass, reverted: spcoin-lib is genuinely ESM-only ("type":
// "module", confirmed by reading its real dist output) while this
// package is CommonJS — Node can't require() real ESM content, and
// spcoin-lib's own "require" exports condition doesn't actually work
// despite claiming to (a latent misconfiguration, not a fixable typo
// here). Fixing that properly means either making this package ESM or
// dual-publishing spcoin-lib as CJS+ESM — real, disproportionate cost
// for a stable 5-line function. Kept duplicated on purpose; byte-
// identical to the published version, so the duplication carries no
// drift risk in practice.
function truncateMiddle(addr, start = 10, end = 8) {
    return addr.length > start + end + 3
        ? `${addr.slice(0, start)}...${addr.slice(-end)}`
        : addr;
}
/**
 * Bitwise flags controlling which sub-elements AssetSelectDropDown renders.
 * Shared by AccountSelectDropDown and TokenSelectDropDown.
 */
exports.ASSET_SELECT_DISPLAY = {
    ICON: 1,
    ADDRESS: 2,
    SYMBOL: 4,
    NAME: 8,
    CHEVRON_UP: 16,
    CHEVRON_DN: 32,
    COPY: 64,
    /** When set, the address/copy/chevron render inside the styled (bg + rounded) pill container; otherwise they render bare. */
    ADDR_COMP: 128,
    /** Modifies ADDR_COMP: frosted-glass pill (backdrop-blur + translucent bg) instead of the solid one. No effect unless ADDR_COMP is also set. */
    ADDR_COMP_BLUR: 256,
};
function AssetSelectDropDown({ icon, symbol, name, address = '', addressTitle, hasEntity, placeholderLabel = 'Select', copyLabel = 'Copy address', showDisplay, showSymbol: showSymbolProp = false, showName: showNameProp = false, nameLineSuffix, nameLineClassName = 'text-sm font-semibold leading-tight text-white', onRowClick, onAddressClick, onIconClick, onIconContextMenu, addrPrePostSize, addressSizeClassName = 'text-sm', panelGateId, panelGate: PanelGate, rootId = 'ASSET_SELECT_DROP_DOWN', defaultExpanded = false, restrictRowClickToChevron = false, collapseKey, onExpandedChange, iconSizeClassName = 'h-10 w-10', }) {
    const [copied, setCopied] = (0, react_1.useState)(false);
    // Clicking the address toggles between compact and full display — separate
    // from addrPrePostSize, which just sets what "compact" means.
    const [addressExpanded, setAddressExpanded] = (0, react_1.useState)(defaultExpanded);
    (0, react_1.useEffect)(() => {
        setAddressExpanded(defaultExpanded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, defaultExpanded, collapseKey]);
    (0, react_1.useEffect)(() => {
        onExpandedChange === null || onExpandedChange === void 0 ? void 0 : onExpandedChange(addressExpanded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addressExpanded]);
    const showIcon = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.ICON);
    const showAddress = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.ADDRESS);
    const showSymbol = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.SYMBOL) || showSymbolProp;
    const showName = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.NAME) || showNameProp;
    const showChevronUp = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.CHEVRON_UP);
    const showChevronDn = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.CHEVRON_DN);
    const showCopy = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.COPY);
    const showAddrComp = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.ADDR_COMP);
    const showAddrCompBlur = !!(showDisplay & exports.ASSET_SELECT_DISPLAY.ADDR_COMP_BLUR);
    const showDivider = showSymbol && showName;
    const renderAddress = showAddress && addrPrePostSize !== 0;
    // Toggling only makes sense when there's actually a compact form to expand
    // out of — full-address mode (addrPrePostSize undefined) has nothing to
    // toggle between.
    const canToggleAddress = addrPrePostSize !== undefined;
    const displayedAddress = addrPrePostSize === undefined
        ? address
        : addressExpanded
            ? address
            : truncateMiddle(address, addrPrePostSize, addrPrePostSize);
    const handleAddressClick = (0, react_1.useCallback)((e) => {
        // Always stop propagation: clicking the address must never fall
        // through to onRowClick (which returns the entity to the caller) —
        // that's the icon's job, not the address's.
        e.preventDefault();
        e.stopPropagation();
        if (onAddressClick) {
            onAddressClick(e);
            return;
        }
        if (canToggleAddress) {
            setAddressExpanded((prev) => !prev);
        }
    }, [onAddressClick, canToggleAddress]);
    const addrRowClassName = showAddrComp
        ? showAddrCompBlur
            // text-[14px], not the original text-[17px] — the expanded (untruncated,
            // addrPrePostSize undefined) 42-char address form was overflowing this
            // pill's container off the edge of the panel; a modest size step down
            // is enough to fit it without needing a different truncation strategy.
            ? 'flex h-[25px] items-center gap-1 rounded-full backdrop-blur-md bg-blue-600/30 ring-1 ring-inset ring-blue-300/30 px-2 font-bold text-[14px] text-white'
            : 'flex h-[25px] items-center gap-1 rounded-full bg-[#243056] px-2 font-bold text-[14px] text-white'
        // Sized explicitly (default text-sm, matching the symbol/name line above
        // it) so it reads at a consistent scale regardless of whatever ambient
        // font-size the caller's own container happens to set.
        : `flex items-center gap-1 ${addressSizeClassName}`;
    const handleCopy = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!address)
            return;
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [address]);
    const content = ((0, jsx_runtime_1.jsxs)("div", { id: rootId, className: `flex items-center gap-1 ${restrictRowClickToChevron ? '' : 'cursor-pointer'}`, onMouseDown: (e) => e.stopPropagation(), onClick: restrictRowClickToChevron ? undefined : onRowClick, children: [hasEntity && showIcon && icon && ((0, jsx_runtime_1.jsx)("div", { className: `flex ${iconSizeClassName} shrink-0 items-center justify-center overflow-hidden rounded-lg relative -top-[2px] ${onIconClick ? 'cursor-pointer' : ''}`, onClickCapture: onIconClick
                    ? (e) => {
                        // Capture phase: runs before the icon's own bubble-phase
                        // onClick (e.g. AccountAvatar's), so stopping here fully
                        // preempts it instead of racing/duplicating with it.
                        e.stopPropagation();
                        onIconClick(e);
                    }
                    : undefined, onContextMenuCapture: onIconContextMenu
                    ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onIconContextMenu(e);
                    }
                    : undefined, children: icon })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col justify-center", children: [hasEntity && (showSymbol || showName) && (symbol || name) && ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-center gap-1 ${nameLineClassName}`, children: [showSymbol && (0, jsx_runtime_1.jsx)("span", { children: symbol }), showDivider && (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: "|" }), showName && (0, jsx_runtime_1.jsx)("span", { children: name }), nameLineSuffix] })), (0, jsx_runtime_1.jsxs)("div", { className: addrRowClassName, children: [hasEntity ? (renderAddress &&
                                (address ? ((0, jsx_runtime_1.jsx)("span", { title: addressTitle !== null && addressTitle !== void 0 ? addressTitle : address, onClick: handleAddressClick, onMouseDown: (e) => e.stopPropagation(), className: onAddressClick || canToggleAddress ? 'cursor-pointer' : undefined, children: displayedAddress })) : (
                                // hasEntity but no address yet — a caller-supplied "unselected"
                                // placeholder entity (see AccountSelectDropDown's N/A/fallback-
                                // icon handling), distinct from hasEntity===false below: that
                                // path also suppresses the icon and symbol/name row, which a
                                // caller deliberately showing placeholder icon/N/A content
                                // doesn't want.
                                (0, jsx_runtime_1.jsx)("span", { className: "text-slate-400", children: placeholderLabel })))) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["\u00A0", placeholderLabel, ": "] })), address && showCopy && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleCopy, onMouseDown: (e) => e.stopPropagation(), className: "shrink-0 flex items-center justify-center rounded hover:bg-white/10 p-0.5", "aria-label": copyLabel, title: copyLabel, children: copied
                                    ? (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 14, className: "text-green-400" })
                                    : (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { size: 14 }) })), (showChevronUp || showChevronDn) && ((0, jsx_runtime_1.jsxs)("span", { className: `inline-flex ${restrictRowClickToChevron ? 'cursor-pointer' : ''}`, title: placeholderLabel, onClick: restrictRowClickToChevron
                                    ? (e) => {
                                        e.stopPropagation();
                                        onRowClick === null || onRowClick === void 0 ? void 0 : onRowClick(e);
                                    }
                                    : undefined, onMouseDown: restrictRowClickToChevron ? (e) => e.stopPropagation() : undefined, children: [showChevronUp && (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { size: 16, "aria-label": placeholderLabel }), showChevronDn && (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16, "aria-label": placeholderLabel })] }))] })] })] }));
    if (panelGateId === undefined || !PanelGate)
        return content;
    return ((0, jsx_runtime_1.jsx)(PanelGate, { panel: panelGateId, lazyLoad: false, children: content }));
}
