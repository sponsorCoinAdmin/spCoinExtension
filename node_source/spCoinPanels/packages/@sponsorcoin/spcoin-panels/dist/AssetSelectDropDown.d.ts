import React from 'react';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
/**
 * Bitwise flags controlling which sub-elements AssetSelectDropDown renders.
 * Shared by AccountSelectDropDown and TokenSelectDropDown.
 */
export declare const ASSET_SELECT_DISPLAY: {
    readonly ICON: 1;
    readonly ADDRESS: 2;
    readonly SYMBOL: 4;
    readonly NAME: 8;
    readonly CHEVRON_UP: 16;
    readonly CHEVRON_DN: 32;
    readonly COPY: 64;
    /** When set, the address/copy/chevron render inside the styled (bg + rounded) pill container; otherwise they render bare. */
    readonly ADDR_COMP: 128;
    /** Modifies ADDR_COMP: frosted-glass pill (backdrop-blur + translucent bg) instead of the solid one. No effect unless ADDR_COMP is also set. */
    readonly ADDR_COMP_BLUR: 256;
};
export interface AssetSelectDropDownProps {
    /** Rendered inside the icon slot (e.g. AccountAvatar / TokenLogo). Only shown when hasEntity && ICON bit set. */
    icon?: React.ReactNode;
    /** Entity's symbol, for the "$symbol | $name" line. */
    symbol?: string;
    /** Entity's name, for the "$symbol | $name" line. */
    name?: string;
    /** Entity's raw address (this component truncates it for display). */
    address?: string;
    /** Overrides the address span's hover title. Defaults to `address` itself when omitted — set this to show extra hover-only context (e.g. network auth source) without changing the visible label. */
    addressTitle?: string;
    /** Whether an entity is currently selected. When false, placeholderLabel renders instead of the address. */
    hasEntity: boolean;
    /** Text shown (before ": ") when hasEntity is false; also used as the chevron's title/aria-label. */
    placeholderLabel?: string;
    /** aria-label/title for the copy button. */
    copyLabel?: string;
    /** Bitmask (see ASSET_SELECT_DISPLAY) controlling which sub-elements render. */
    showDisplay: number;
    /** Convenience additive flag — shows the "$symbol | $name" line's symbol half on top of whatever showDisplay already sets. Defaults to false. */
    showSymbol?: boolean;
    /** Convenience additive flag — shows the "$symbol | $name" line's name half on top of whatever showDisplay already sets. Defaults to false. */
    showName?: boolean;
    /**
     * Extra content rendered inline at the end of the "$symbol | $name" line
     * itself (e.g. an "Active" badge) — same line as the name text, not the
     * icon/button column on the far right. No effect unless that line is
     * actually showing (hasEntity && (showSymbol || showName)).
     */
    nameLineSuffix?: React.ReactNode;
    /** Overrides the "$symbol | $name" line's className (default: text-sm font-semibold leading-tight text-white) — e.g. a caller showing an error message in that slot instead of a real symbol/name (see ErrorAssetPreview.tsx). */
    nameLineClassName?: string;
    /** Click handler for the row (chevron, and the address when onAddressClick isn't given). */
    onRowClick?: (e: React.SyntheticEvent) => void;
    /**
     * Optional separate click handler for the address text only. When provided,
     * clicking the address stops propagation and calls this instead of
     * onRowClick. Omit to keep the address bubbling into onRowClick.
     */
    onAddressClick?: (e: React.MouseEvent) => void;
    /**
     * Optional override for the icon/avatar click, uniform across every
     * inheriting member (AccountSelectDropDown, TokenSelectDropDown) — neither
     * has to wire this into its own icon component. Intercepted in the capture
     * phase so it preempts whatever default click behavior the icon itself
     * implements (e.g. AccountAvatar opening the asset view — the same
     * openAccountComponent call the info.png button uses). When omitted, no
     * capture handler is attached and the icon's own default behavior runs
     * unmodified, so "open the asset view" still resolves to exactly that same
     * method.
     */
    onIconClick?: (e: React.MouseEvent) => void;
    /**
     * Right-click override for the icon/avatar, same uniform interception
     * pattern as onIconClick (capture phase, preventDefault to suppress the
     * native browser context menu). Omit to leave the native context menu
     * untouched.
     */
    onIconContextMenu?: (e: React.MouseEvent) => void;
    /**
     * Number of characters kept from the start (including "0x") and from the
     * end of the address before/after the "..." filler, e.g. 4 → "0xf3...2266".
     * 0 suppresses the address entirely (regardless of the ADDRESS bit).
     * Omitted/undefined shows the full, untruncated address.
     */
    addrPrePostSize?: number;
    /**
     * Overrides the address row's text-size class for the bare (non-ADDR_COMP)
     * case only — callers with extra vertical room to spare (e.g. a top-level
     * list row) can size the address up from the text-sm default. No effect
     * when ADDR_COMP is set — that pill case has its own fixed text-[17px].
     */
    addressSizeClassName?: string;
    /** Panel id this instance is gated by. If omitted, renders unconditionally (no PanelGate). */
    panelGateId?: SP_COIN_DISPLAY;
    /**
     * The PanelGate implementation to gate with, when panelGateId is set.
     * Injected rather than imported directly (2026-09-11, portability pass)
     * so this file has no hardcoded dependency on any one app's PanelGate —
     * the web app passes its real '@/components/utility/PanelGate'; a future
     * standalone consumer (e.g. the extension) would pass its own or omit
     * gating entirely. No effect when panelGateId is omitted. If panelGateId
     * IS set but this is omitted, renders unconditionally rather than
     * throwing — this is a display component, not a security gate, so
     * failing open (visible) is the safe default for a misconfigured caller.
     */
    panelGate?: React.ComponentType<{
        panel: SP_COIN_DISPLAY;
        children: React.ReactNode;
        lazyLoad?: boolean;
        className?: string;
    }>;
    /** Root element id. */
    rootId?: string;
    /**
     * Starting/reset state for the compact<->full address toggle (only
     * meaningful when addrPrePostSize is set, i.e. canToggleAddress). Defaults
     * to false (today's look — starts compact). A caller showing one single
     * important address (not a long list row) can start it expanded while
     * still leaving it collapsible via the same click.
     */
    defaultExpanded?: boolean;
    /**
     * When true, onRowClick only fires from the chevron itself — the rest of
     * the pill (icon, name, address) becomes inert to clicks instead of the
     * whole row opening the picker. Default false (existing behavior: the
     * whole row is clickable), which is still correct for list rows (each row
     * IS the thing being picked) and existing trigger pills elsewhere. Only
     * meaningful when a chevron is actually shown (CHEVRON_UP/CHEVRON_DN) —
     * with neither bit set, nothing would open onRowClick at all.
     */
    restrictRowClickToChevron?: boolean;
    /**
     * Any value that changes when this row's own tab/panel becomes visible
     * again (e.g. pass usePanelVisible(SEND_PANEL) — a boolean flipping
     * false→true counts as a change). Forces the compact/full address toggle
     * back to defaultExpanded when it changes. Without this, a row that stays
     * mounted-but-hidden across tab switches (the norm in this app, to avoid
     * remount/refetch churn) keeps whatever expand state the user last left
     * it in instead of reopening collapsed. Omit for rows that don't live
     * inside a switchable tab (nothing to reset on).
     */
    collapseKey?: unknown;
    /**
     * Fires whenever the compact/full address toggle changes (both from a
     * user click and from the collapseKey-driven reset above). Callers whose
     * own layout has a label/other content positioned where the expanded
     * (untruncated) address pill can grow into it — see SendSelectPanel/
     * SendRecipientPanel's own absolute-positioned label — use this to hide
     * that content while expanded instead of letting the two overlap.
     */
    onExpandedChange?: (expanded: boolean) => void;
    /**
     * Overrides the icon slot's default `h-10 w-10` sizing (the rest of that
     * box's classes — shrink-0/overflow-hidden/rounded-lg/etc. — are
     * unaffected, only the size). Omit to keep every existing consumer's
     * look unchanged; a caller wanting a bigger/smaller icon than the shared
     * 40px default passes its own size classes here instead of this
     * component growing a special case per caller.
     */
    iconSizeClassName?: string;
}
export default function AssetSelectDropDown({ icon, symbol, name, address, addressTitle, hasEntity, placeholderLabel, copyLabel, showDisplay, showSymbol: showSymbolProp, showName: showNameProp, nameLineSuffix, nameLineClassName, onRowClick, onAddressClick, onIconClick, onIconContextMenu, addrPrePostSize, addressSizeClassName, panelGateId, panelGate: PanelGate, rootId, defaultExpanded, restrictRowClickToChevron, collapseKey, onExpandedChange, iconSizeClassName, }: AssetSelectDropDownProps): import("react/jsx-runtime").JSX.Element;
