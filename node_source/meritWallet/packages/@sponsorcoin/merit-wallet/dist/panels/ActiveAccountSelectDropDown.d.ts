import React from 'react';
/** WalletAccountListVisible (see the header comment). */
export declare function useWalletAccountListVisible(): boolean;
export interface ActiveAccountSelectDropDownProps {
    icon?: React.ReactNode;
    address?: string;
    symbol?: string;
    name?: string;
    placeholderLabel?: string;
    /** The pill itself was clicked: the host toggles the account list. */
    onSelectClick?: () => void;
    /** The avatar was clicked: the host opens the account's detail screen. */
    onIconClick?: (address: string) => void;
    /**
     * 2026-11-11 (owner): what makes this the ACTIVE-account dropdown. A left click on the pill or on its avatar first makes the account it shows the active one (the host's own activation, injected here: this package never branches on the host), then hands over to
     * AccountSelectDropDown's own actions (onSelectClick / onIconClick). Omit it and the click only does those. A failed activation is traced and the click still goes on.
     */
    onActivate?: (address: string) => void | Promise<void>;
    /** A right click on the avatar: handed to AccountSelectDropDown (which opens ACCOUNT_PANEL for the account). The host's own way of opening it (the wallet's account details) is passed here. */
    onIconContextMenu?: (address: string) => void;
}
export default function ActiveAccountSelectDropDown({ icon, address, symbol, name, placeholderLabel, onSelectClick, onIconClick, onActivate, onIconContextMenu }: ActiveAccountSelectDropDownProps): React.JSX.Element;
