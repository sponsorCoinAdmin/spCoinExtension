import React from 'react';
export interface NetworkSelectDropDownProps {
    /** Rendered in the icon slot — omit for no icon (the honest default:
     *  there's no real network to show a logo for yet). */
    icon?: React.ReactNode;
    /** Defaults to "Not Connected" — the real component's own default label
     *  for this exact state (disconnected, showConnect true). */
    label?: string;
    /** Omit for an inert pill with nothing to open yet. */
    onSelectClick?: () => void;
    onIconClick?: () => void;
    /** Flips the chevron to point up while the panel this opens is already
     *  showing — same chevronUp convention the real trigger-mode file uses.
     *  Defaults false (closed). */
    chevronUp?: boolean;
    /** 2026-11-03 (owner request): the chain's symbol, name and id. With an id the pill reads like the account pill: "$symbol | $name" over the id (31337), instead of the name alone in the pill. */
    symbol?: string;
    name?: string;
    id?: string | number;
}
export default function NetworkSelectDropDown({ icon, label, onSelectClick, onIconClick, chevronUp, symbol, name, id, }: NetworkSelectDropDownProps): React.JSX.Element;
