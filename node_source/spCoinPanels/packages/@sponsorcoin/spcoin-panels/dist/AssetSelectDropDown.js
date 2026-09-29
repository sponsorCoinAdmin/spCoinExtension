// File: node_source/spCoinPanels/AssetSelectDropDowns/AssetSelectDropDown.tsx
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
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
// 2026-09-16 — real bug found live in spCoinExtension, bigger than first
// thought: this whole component's actual LAYOUT (flex/gap/alignItems on
// every row, text truncation, pill backgrounds, font sizing) is driven
// entirely by Tailwind classes, with zero inline-style fallback except the
// icon width/height fixed earlier the same session. This package has no
// Tailwind dependency of its own (deliberately — see WalletHeader.tsx's own
// "a component library shouldn't require every consumer to run a Tailwind
// pipeline" doc comment) — confirmed spCoinExtension has no
// tailwind.config/postcss.config/CSS import anywhere, so every one of these
// classes has always been inert there, not just the icon size. Every
// caller-customizable className prop (iconSizeClassName/pillHeightClassName/
// pillFontClassName/nameLineClassName/addressSizeClassName) keeps its
// Tailwind-class-string shape (every real app call site already passes one
// of a small, known vocabulary — bracket arbitrary values, font-weight/
// leading/color utility names) rather than changing the prop type and
// forcing every real caller to update — these small parsers below extract
// the same real values back out for a genuine inline-style fallback,
// falling back to this component's own current default's real equivalent
// when a class string doesn't match the known vocabulary (never silently
// undefined).
function parsePxFromSizeClassName(className) {
    const widthMatch = className.match(/w-\[(\d+(?:\.\d+)?)px\]/);
    const heightMatch = className.match(/h-\[(\d+(?:\.\d+)?)px\]/);
    return {
        width: widthMatch ? Number(widthMatch[1]) : undefined,
        height: heightMatch ? Number(heightMatch[1]) : undefined,
    };
}
function parseHeightPx(className, fallback) {
    const match = className.match(/h-\[(\d+)px\]/);
    return match ? Number(match[1]) : fallback;
}
const TEXT_SIZE_PX = { 'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18, 'text-xl': 20 };
function parseFontSizePx(className, fallback) {
    const bracketMatch = className.match(/text-\[(\d+)px\]/);
    if (bracketMatch)
        return Number(bracketMatch[1]);
    for (const [cls, px] of Object.entries(TEXT_SIZE_PX)) {
        if (className.includes(cls))
            return px;
    }
    return fallback;
}
const FONT_WEIGHT = { 'font-normal': 400, 'font-medium': 500, 'font-semibold': 600, 'font-bold': 700 };
function parseFontWeight(className, fallback) {
    for (const [cls, weight] of Object.entries(FONT_WEIGHT)) {
        if (className.includes(cls))
            return weight;
    }
    return fallback;
}
function parseLineHeight(className, fallback) {
    if (className.includes('leading-tight'))
        return 1.25;
    if (className.includes('leading-normal'))
        return 1.5;
    if (className.includes('leading-none'))
        return 1;
    return fallback;
}
function parseTextColor(className, fallback) {
    if (className.includes('text-white'))
        return '#ffffff';
    if (className.includes('text-slate-400'))
        return '#94a3b8';
    return fallback;
}
/**
 * Bitwise flags controlling which sub-elements AssetSelectDropDown renders.
 * Shared by AccountSelectDropDown and TokenSelectDropDown.
 */
export const ASSET_SELECT_DISPLAY = {
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
export default function AssetSelectDropDown({ icon, symbol, name, address = '', addressTitle, hasEntity, placeholderLabel = 'Select', copyLabel = 'Copy address', showDisplay, showSymbol: showSymbolProp = false, showName: showNameProp = false, nameLineSuffix, 
// 2026-09-15, on request ("Symbol | Name scaling should be the exact same
// size for all other DropDowns and throughout the program") — was
// text-sm (14px), a leftover default nobody had actually reasoned about;
// every caller that explicitly sizes this (AccountRow.tsx/
// AccountListItem.tsx/TokenListItem.tsx/NetworkSelectDropDown.tsx) had
// already independently converged on text-[11px] to match this same
// pill's own ADDR_COMP address line (pillFontClassName), so a caller that
// omitted nameLineClassName silently got Symbol|Name text ~27% larger
// than its own address line right below it — most visible on
// PanelSubTitle.tsx's header chip, which explicitly matches every OTHER
// sizing prop here (icon/pill/chevron) to this same 11px scale but had
// simply never been given this one. Changed the default itself, not just
// PanelSubTitle's call site, so every caller that relies on the default
// (rather than setting its own) gets this one consistent size too.
nameLineClassName = 'text-[11px] font-semibold leading-tight text-white', onRowClick, onAddressClick, onIconClick, onIconContextMenu, addrPrePostSize, addressSizeClassName = 'text-sm', panelGateId, panelGate: PanelGate, rootId = 'ASSET_SELECT_DROP_DOWN', defaultExpanded = false, restrictRowClickToChevron = false, collapseKey, onExpandedChange, iconSizeClassName = 'h-[22px] w-[22px]', pillHeightClassName = 'h-[16px]', pillFontClassName = 'text-[11px]', chevronSize = 12, copyIconSize = 12, }) {
    const [copied, setCopied] = useState(false);
    // Clicking the address toggles between compact and full display — separate
    // from addrPrePostSize, which just sets what "compact" means.
    const [addressExpanded, setAddressExpanded] = useState(defaultExpanded);
    useEffect(() => {
        setAddressExpanded(defaultExpanded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, defaultExpanded, collapseKey]);
    useEffect(() => {
        onExpandedChange?.(addressExpanded);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addressExpanded]);
    const iconPxSize = parsePxFromSizeClassName(iconSizeClassName);
    const pillHeightPx = parseHeightPx(pillHeightClassName, 16);
    const pillFontPx = parseFontSizePx(pillFontClassName, 11);
    const addressFontPx = parseFontSizePx(addressSizeClassName, 14);
    const nameLineStyle = {
        fontSize: parseFontSizePx(nameLineClassName, 11),
        fontWeight: parseFontWeight(nameLineClassName, 600),
        lineHeight: parseLineHeight(nameLineClassName, 1.25),
        color: parseTextColor(nameLineClassName, '#ffffff'),
    };
    const showIcon = !!(showDisplay & ASSET_SELECT_DISPLAY.ICON);
    const showAddress = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDRESS);
    const showSymbol = !!(showDisplay & ASSET_SELECT_DISPLAY.SYMBOL) || showSymbolProp;
    const showName = !!(showDisplay & ASSET_SELECT_DISPLAY.NAME) || showNameProp;
    const showChevronUp = !!(showDisplay & ASSET_SELECT_DISPLAY.CHEVRON_UP);
    const showChevronDn = !!(showDisplay & ASSET_SELECT_DISPLAY.CHEVRON_DN);
    const showCopy = !!(showDisplay & ASSET_SELECT_DISPLAY.COPY);
    const showAddrComp = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDR_COMP);
    const showAddrCompBlur = !!(showDisplay & ASSET_SELECT_DISPLAY.ADDR_COMP_BLUR);
    const showDivider = showSymbol && showName;
    // Real inline-style equivalent of addrRowClassName below — same three
    // variants (ADDR_COMP+blur / ADDR_COMP solid / bare), computed as real
    // values instead of Tailwind arbitrary/utility classes.
    const addrRowStyle = showAddrComp
        ? {
            display: 'flex',
            alignSelf: 'flex-start',
            height: pillHeightPx,
            alignItems: 'center',
            gap: 4,
            borderRadius: 9999,
            paddingLeft: 8,
            paddingRight: 8,
            fontWeight: 700,
            fontSize: pillFontPx,
            color: '#ffffff',
            minWidth: 0,
            ...(showAddrCompBlur
                ? { backdropFilter: 'blur(12px)', background: 'rgba(37,99,235,0.3)', boxShadow: 'inset 0 0 0 1px rgba(147,197,253,0.3)' }
                : { background: '#243056' }),
        }
        : {
            display: 'flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: 4,
            fontSize: addressFontPx,
            minWidth: 0,
        };
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
    const handleAddressClick = useCallback((e) => {
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
    // min-w-0 on every variant: the font-size step-down noted below helped but
    // didn't actually fix the overflow — a flex row's default min-width:auto
    // still refuses to shrink narrower than its un-truncated text content
    // regardless of font size. This is the other end of the min-w-0 chain
    // started on the outer row divs above; the address span itself (below)
    // is what actually clips with an ellipsis once this chain lets it shrink.
    // self-start on every variant: this div sits inside a `flex flex-col`
    // parent (with the symbol/name line as its sibling above), and a flex
    // column's children default to align-items:stretch — cross-axis
    // (horizontal) stretch, not content-hugging. That was pulling the pill's
    // own rounded/colored background out to the full width of the symbol/
    // name line above it (2026-09-15, reported live: the address pill read
    // as wide as "ETH | Base" instead of just wrapping "0xee...eeee" + the
    // copy icon). self-start opts this one row out of that stretch so its
    // background genuinely hugs only its own content, matching what a pill
    // badge is supposed to look like.
    const addrRowClassName = showAddrComp
        ? showAddrCompBlur
            // text-[14px], not the original text-[17px] — the expanded (untruncated,
            // addrPrePostSize undefined) 42-char address form was overflowing this
            // pill's container off the edge of the panel; a modest size step down
            // is enough to fit it without needing a different truncation strategy.
            ? `flex self-start ${pillHeightClassName} items-center gap-1 rounded-full backdrop-blur-md bg-blue-600/30 ring-1 ring-inset ring-blue-300/30 px-2 font-bold ${pillFontClassName} text-white min-w-0`
            : `flex self-start ${pillHeightClassName} items-center gap-1 rounded-full bg-[#243056] px-2 font-bold ${pillFontClassName} text-white min-w-0`
        // Sized explicitly (default text-sm, matching the symbol/name line above
        // it) so it reads at a consistent scale regardless of whatever ambient
        // font-size the caller's own container happens to set.
        : `flex self-start items-center gap-1 ${addressSizeClassName} min-w-0`;
    const handleCopy = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!address)
            return;
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [address]);
    const content = (
    // min-w-0: required for the truncation chain below to actually work —
    // a flex item's default min-width:auto refuses to shrink narrower than
    // its content, which is exactly how an expanded (untruncated) address
    // was spilling past the container edge instead of being clipped (2026-
    // 09-15, reported live: ETH's expanded address overflowed the "Select a
    // Token" panel while the still-compact SPCOIN_V99/V0 rows next to it
    // didn't). Every ancestor down to the address span itself needs this —
    // see that span's own comment below for the other end of the chain.
    _jsxs("div", { id: rootId, className: `flex items-center gap-1 min-w-0 ${restrictRowClickToChevron ? '' : 'cursor-pointer'}`, style: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, cursor: restrictRowClickToChevron ? 'default' : 'pointer' }, onMouseDown: (e) => e.stopPropagation(), onClick: restrictRowClickToChevron ? undefined : onRowClick, children: [hasEntity && showIcon && icon && (_jsx("div", { className: `flex ${iconSizeClassName} shrink-0 items-center justify-center overflow-hidden rounded-lg relative -top-[2px] ${onIconClick ? 'cursor-pointer' : ''}`, style: {
                    display: 'flex',
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: 8,
                    position: 'relative',
                    top: -2,
                    cursor: onIconClick ? 'pointer' : undefined,
                    width: iconPxSize.width,
                    height: iconPxSize.height,
                    minWidth: iconPxSize.width,
                    minHeight: iconPxSize.height,
                }, onClickCapture: onIconClick
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
                    : undefined, children: icon })), _jsxs("div", { className: "flex flex-col justify-center items-start min-w-0", style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0, width: 'fit-content', maxWidth: '100%' }, children: [hasEntity && (showSymbol || showName) && (symbol || name) && (_jsxs("div", { className: `flex items-center gap-1 ${nameLineClassName} ${onAddressClick || canToggleAddress ? 'cursor-pointer' : ''}`, style: { display: 'flex', alignItems: 'center', gap: 4, cursor: onAddressClick || canToggleAddress ? 'pointer' : undefined, ...nameLineStyle }, onClick: handleAddressClick, onMouseDown: (e) => e.stopPropagation(), children: [showSymbol && _jsx("span", { children: symbol }), showDivider && _jsx("span", { className: "text-slate-400", style: { color: '#94a3b8' }, children: "|" }), showName && _jsx("span", { children: name }), nameLineSuffix] })), _jsxs("div", { className: addrRowClassName, style: { ...addrRowStyle, width: 'fit-content', maxWidth: '100%' }, children: [hasEntity ? (renderAddress &&
                                (address ? (_jsx("span", { title: addressTitle ?? address, onClick: handleAddressClick, onMouseDown: (e) => e.stopPropagation(), 
                                    // truncate = overflow-hidden + text-ellipsis + whitespace-nowrap
                                    // — the actual clip point of the min-w-0 chain started on the
                                    // ancestor divs above. Only bites once the row genuinely has
                                    // no more room to give (e.g. a narrow list row with an
                                    // expanded 42-char address) — a caller with space to spare
                                    // still shows the full text, nothing changes for it. Hover
                                    // still reveals the untruncated address either way (title
                                    // above).
                                    className: `block truncate min-w-0 ${onAddressClick || canToggleAddress ? 'cursor-pointer' : ''}`, style: {
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        minWidth: 0,
                                        cursor: onAddressClick || canToggleAddress ? 'pointer' : undefined,
                                    }, children: displayedAddress })) : (
                                // hasEntity but no address yet — a caller-supplied "unselected"
                                // placeholder entity (see AccountSelectDropDown's N/A/fallback-
                                // icon handling), distinct from hasEntity===false below: that
                                // path also suppresses the icon and symbol/name row, which a
                                // caller deliberately showing placeholder icon/N/A content
                                // doesn't want.
                                _jsx("span", { className: "text-slate-400", style: { color: '#94a3b8' }, children: placeholderLabel })))) : (_jsxs(_Fragment, { children: ["\u00A0", placeholderLabel, ": "] })), address && showCopy && (_jsx("button", { type: "button", onClick: handleCopy, onMouseDown: (e) => e.stopPropagation(), className: "shrink-0 flex items-center justify-center rounded hover:bg-white/10 p-0.5", style: {
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    padding: 2,
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'inherit',
                                }, "aria-label": copyLabel, title: copyLabel, children: copied
                                    ? _jsx(Check, { size: copyIconSize, className: "text-green-400", style: { color: '#4ade80' } })
                                    : _jsx(Copy, { size: copyIconSize }) })), (showChevronUp || showChevronDn) && (_jsxs("span", { className: `inline-flex ${restrictRowClickToChevron ? 'cursor-pointer' : ''}`, style: { display: 'inline-flex', cursor: restrictRowClickToChevron ? 'pointer' : undefined }, title: placeholderLabel, onClick: restrictRowClickToChevron
                                    ? (e) => {
                                        e.stopPropagation();
                                        onRowClick?.(e);
                                    }
                                    : undefined, onMouseDown: restrictRowClickToChevron ? (e) => e.stopPropagation() : undefined, children: [showChevronUp && _jsx(ChevronUp, { size: chevronSize, "aria-label": placeholderLabel }), showChevronDn && _jsx(ChevronDown, { size: chevronSize, "aria-label": placeholderLabel })] }))] })] })] }));
    if (panelGateId === undefined || !PanelGate)
        return content;
    return (_jsx(PanelGate, { panel: panelGateId, lazyLoad: false, children: content }));
}
