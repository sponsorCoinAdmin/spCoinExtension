import React from 'react';
export interface AgentSelectDropDownProps {
    /** Rendered in the icon slot when an agent is selected. Omit for the
     *  unselected placeholder — no default avatar, since there's no default
     *  agent to show one for. Real caller passes its own resolved
     *  AccountAvatar-or-fallback element, same convention as TradeAmountRow's
     *  tokenIcon prop. */
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    /** Shown (as "$placeholderLabel: ") when nothing is selected. */
    placeholderLabel?: string;
    /** Called on click (e.g. open/close an agent picker). Omit for an inert
     *  pill with no picker to open — today's placeholder default. */
    onSelectClick?: (e: React.SyntheticEvent) => void;
    /** Whether the picker this trigger opens is currently open — flips the
     *  chevron direction (matches AccountSelectDropDown's own
     *  CHEVRON_UP/CHEVRON_DN convention: up means open). Omit for a
     *  permanently-closed-looking chevron (today's placeholder default). */
    listOpen?: boolean;
    /** Chars kept before/after the "..." filler (see AssetSelectDropDown's
     *  own truncateMiddle). Omit for the full, untruncated address. */
    addrPrePostSize?: number;
    /** Panel id this instance is gated by. If omitted, renders unconditionally
     *  (no PanelGate) — same contract as AssetSelectDropDown's own
     *  panelGateId/panelGate pair, duplicated here rather than imported
     *  since this component deliberately has no dependency on
     *  AssetSelectDropDown (see this file's own header comment on why). */
    panelGateId?: number;
    /** The PanelGate implementation to gate with, when panelGateId is set —
     *  injected so this file has no hardcoded dependency on any one app's
     *  PanelGate. The web app passes its real '@/components/utility/PanelGate';
     *  an extension caller can pass this package's own PanelGate.tsx (2026-09-21,
     *  Path A — bound to the real @sponsorcoin/spcoin-exchange-engine, same
     *  code both apps share), or omit both props for unconditional
     *  rendering. No effect when panelGateId is omitted. */
    panelGate?: React.ComponentType<{
        panel: number;
        children: React.ReactNode;
        lazyLoad?: boolean;
        className?: string;
    }>;
}
export default function AgentSelectDropDown({ icon, address, symbol, placeholderLabel, onSelectClick, listOpen, addrPrePostSize, panelGateId, panelGate: PanelGate, }: AgentSelectDropDownProps): React.JSX.Element;
