import React from 'react';
export interface AgentSelectDropDownProps {
    /** Rendered in the icon slot when an agent is selected. Omit for the
     *  unselected placeholder — no default avatar, since there's no default
     *  agent to show one for. */
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    /** Shown (as "$placeholderLabel: ") when nothing is selected — the only
     *  real state this component has anything to render for today. */
    placeholderLabel?: string;
    /** Called on click (e.g. open an agent picker). Omit for an inert pill
     *  with no picker to open yet. */
    onSelectClick?: () => void;
}
export default function AgentSelectDropDown({ icon, address, symbol, placeholderLabel, onSelectClick, }: AgentSelectDropDownProps): import("react/jsx-runtime").JSX.Element;
