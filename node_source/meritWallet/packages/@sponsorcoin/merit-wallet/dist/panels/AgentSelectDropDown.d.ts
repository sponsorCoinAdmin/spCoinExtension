import React from 'react';
export interface AgentSelectDropDownProps {
    /** Rendered in the icon slot when an agent is selected. Omit it and the shared dropdown shows the account's own image (fetched by address when it has one), else the shared Anonymous avatar. */
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    name?: string;
    /** Shown (as "$placeholderLabel: ") when nothing is selected. */
    placeholderLabel?: string;
    /** Called on click (e.g. open/close an agent picker). Omit for an inert pill. */
    onSelectClick?: (e: React.SyntheticEvent) => void;
    /** Whether the picker this trigger opens is open: flips the chevron (up means open). */
    listOpen?: boolean;
    /** Chars kept before/after the "..." filler. */
    addrPrePostSize?: number;
    /** Panel id this instance is gated by; omitted, it renders unconditionally. */
    panelGateId?: number;
    /** The PanelGate to gate with when panelGateId is set (injected so the dropdown has no app-specific import). */
    panelGate?: React.ComponentType<{
        panel: number;
        children: React.ReactNode;
        lazyLoad?: boolean;
        className?: string;
    }>;
}
export default function AgentSelectDropDown({ icon, address, symbol, name, placeholderLabel, onSelectClick, listOpen, addrPrePostSize, panelGateId, panelGate }: AgentSelectDropDownProps): React.JSX.Element;
