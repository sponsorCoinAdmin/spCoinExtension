import React from 'react';
export interface TokenSelectDropDownProps {
    /** Rendered in the icon slot when a token is selected — the real caller
     *  resolves this (TokenLogo), same convention as every other promoted
     *  dropdown's icon prop. */
    icon?: React.ReactNode;
    hasEntity?: boolean;
    address?: string;
    symbol?: string;
    name?: string;
    /** Fallback label shown (before ": ") when no token is selected. */
    label?: string;
    /** Row click — no default open-a-picker behavior: the real caller
     *  supplies its own openActiveListPanel orchestration, since which feed
     *  to open (and the re-entrancy guard around it) is an ExchangeContext-
     *  runtime concern this package has no knowledge of. Omit for an inert
     *  pill. */
    onSelectClick?: (e: React.SyntheticEvent) => void;
    onAddressClick?: (e: React.MouseEvent) => void;
    /** Whether a chevron renders at all — Token's chevron has no open/closed
     *  direction toggle (unlike Account/Agent/Recipient's CHEVRON_UP/DN),
     *  just present-or-absent, matching the original's
     *  `chevronPanelId !== undefined` check. */
    showChevron?: boolean;
    /** Bitmask (see ASSET_SELECT_DISPLAY, re-exported from AssetSelectDropDown) overriding the default entirely. */
    showDisplay?: number;
    addrPrePostSize?: number;
    showSymbol?: boolean;
    showName?: boolean;
    collapseKey?: unknown;
    onExpandedChange?: (expanded: boolean) => void;
    /** When true, only the chevron opens the token list; the rest of the pill (including the icon) is otherwise inert to row-open clicks. */
    restrictRowClickToChevron?: boolean;
    copyLabel?: string;
    /** Outer wrapper's own positioning — matches the original's absolute top-[12px]/right-[20px]/min-w-[50px], now inline so it doesn't depend on Tailwind. Override for a caller needing different placement. */
    style?: React.CSSProperties;
    /** Debug/test hook only (see the original's own data-panel-root usage) — which tradeData root this instance is bound to. Purely cosmetic, no rendering effect. */
    dataPanelRoot?: string;
    panelGateId?: number;
    panelGate?: React.ComponentType<{
        panel: number;
        children: React.ReactNode;
        lazyLoad?: boolean;
        className?: string;
    }>;
}
export default function TokenSelectDropDown({ icon, hasEntity, address, symbol, name, label, onSelectClick, onAddressClick, showChevron, showDisplay, addrPrePostSize, showSymbol, showName, collapseKey, onExpandedChange, restrictRowClickToChevron, copyLabel, style, dataPanelRoot, panelGateId, panelGate, }: TokenSelectDropDownProps): React.JSX.Element;
