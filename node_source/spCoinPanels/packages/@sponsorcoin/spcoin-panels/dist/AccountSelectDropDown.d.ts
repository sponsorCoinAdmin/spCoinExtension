import React from 'react';
/** Re-exported under this name for callers that only ever use it for accounts — same bit values as every other *_SELECT_DISPLAY alias. */
export declare const ACCOUNT_SELECT_DISPLAY: {
    readonly ICON: 1;
    readonly ADDRESS: 2;
    readonly SYMBOL: 4;
    readonly NAME: 8;
    readonly CHEVRON_UP: 16;
    readonly CHEVRON_DN: 32;
    readonly COPY: 64;
    readonly ADDR_COMP: 128;
    readonly ADDR_COMP_BLUR: 256;
};
export interface AccountSelectDropDownProps {
    /** Rendered in the icon slot when an account is selected — the real
     *  caller resolves this (AccountAvatar, or the QuestionRed.png
     *  placeholder for a real-but-blank "unselected" account), same
     *  convention as TradeAmountRow's tokenIcon/AgentSelectDropDown's icon. */
    icon?: React.ReactNode;
    /** Whether an account entity exists at all (distinct from address being
     *  empty — see AssetSelectDropDown's own hasEntity doc comment: a
     *  caller-supplied "unselected" placeholder entity still wants the
     *  placeholderLabel shown in the address slot, not the bare "$label: "
     *  fallback hasEntity=false renders instead). */
    hasEntity?: boolean;
    address?: string;
    symbol?: string;
    name?: string;
    /** Row click — no default open-a-picker behavior (unlike the old web-app
     *  version's hardcoded REMOTE_ACCOUNT_RECIPIENT_LIST open/close): the
     *  real caller supplies its own open/close orchestration, since which
     *  list feed to open is an ExchangeContext-runtime concern this package
     *  has no knowledge of. Omit for an inert pill. */
    onSelectClick?: (e: React.SyntheticEvent) => void;
    /** Whether the picker this trigger opens is currently open — flips the
     *  chevron direction, same convention as AgentSelectDropDown's listOpen. */
    listOpen?: boolean;
    /** Fallback label shown (before ": ") when nothing is selected. */
    label?: string;
    /** Bitmask (see ACCOUNT_SELECT_DISPLAY) controlling which sub-elements render. Defaults to icon+address+chevron+copy+pill. */
    showDisplay?: number;
    showSymbol?: boolean;
    showName?: boolean;
    nameLineSuffix?: React.ReactNode;
    nameLineClassName?: string;
    onAddressClick?: (e: React.MouseEvent) => void;
    onIconClick?: (e: React.MouseEvent) => void;
    onIconContextMenu?: (e: React.MouseEvent) => void;
    /** Chars kept before/after the "..." filler (see AssetSelectDropDown). Defaults to 4. */
    addrPrePostSize?: number;
    addressSizeClassName?: string;
    addressTitle?: string;
    copyLabel?: string;
    collapseKey?: unknown;
    onExpandedChange?: (expanded: boolean) => void;
    iconSizeClassName?: string;
    pillHeightClassName?: string;
    pillFontClassName?: string;
    chevronSize?: number;
    copyIconSize?: number;
    /** Panel id this instance is gated by. If omitted, renders unconditionally (no PanelGate) — same contract as AssetSelectDropDown's own panelGateId/panelGate pair. */
    panelGateId?: number;
    /** The PanelGate implementation to gate with, when panelGateId is set — injected so this file has no hardcoded dependency on any one app's PanelGate. */
    panelGate?: React.ComponentType<{
        panel: number;
        children: React.ReactNode;
        lazyLoad?: boolean;
        className?: string;
    }>;
}
declare const AccountSelectDropDown: React.FC<AccountSelectDropDownProps>;
export default AccountSelectDropDown;
