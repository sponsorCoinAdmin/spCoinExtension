import React from 'react';
export type NetworkAuthSource = 'merit' | 'metamask';
export interface NetworkListRowProps {
    icon?: React.ReactNode;
    symbol?: string;
    name?: string;
    address?: string;
    /** Renders the same green "ACTIVE" tag networks.tsx's own activeBadge
     *  does, inline on the Symbol|Name line. */
    isActive?: boolean;
    onSelect?: () => void;
    onIconClick?: () => void;
    onIconContextMenu?: (e: React.MouseEvent) => void;
    /** Current Merit/MetaMask radio selection for THIS row's own chainId —
     *  see networks.tsx's own NetworkAuthToggle doc comment for why this is
     *  kept per-row rather than one shared value. Omit to hide the toggle
     *  entirely (no default — there's no real per-chain auth source to
     *  default to without a real network list behind this). */
    authSource?: NetworkAuthSource;
    onAuthSourceChange?: (source: NetworkAuthSource) => void;
    /** Disambiguates each row's own native radio `name` attribute — see
     *  networks.tsx's own `groupId` doc comment (native radios group
     *  globally by name, not scoped to a React instance). */
    groupId?: string;
}
export default function NetworkListRow({ icon, symbol, name, address, isActive, onSelect, onIconClick, onIconContextMenu, authSource, onAuthSourceChange, groupId, }: NetworkListRowProps): import("react/jsx-runtime").JSX.Element;
